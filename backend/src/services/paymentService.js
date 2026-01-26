const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { Order } = require('../models');

class PaymentService {
    constructor() {
        this.razorpay = new Razorpay({
            key_id: config.razorpay.keyId,
            key_secret: config.razorpay.keySecret,
        });
    }

    /**
     * Create Razorpay order
     */
    async createRazorpayOrder(order) {
        try {
            const options = {
                amount: Math.round(order.total * 100), // Amount in paise
                currency: 'INR',
                receipt: order.orderId,
                notes: {
                    orderId: order._id.toString(),
                    userId: order.user.toString(),
                },
            };

            const razorpayOrder = await this.razorpay.orders.create(options);

            // Update order with Razorpay order ID
            order.razorpayOrderId = razorpayOrder.id;
            await order.save();

            logger.info(`Razorpay order created: ${razorpayOrder.id} for order: ${order.orderId}`);

            return razorpayOrder;
        } catch (error) {
            logger.error('Error creating Razorpay order:', error);
            throw error;
        }
    }

    /**
     * Generate payment link
     */
    async generatePaymentLink(order, user) {
        try {
            const paymentLink = await this.razorpay.paymentLink.create({
                amount: Math.round(order.total * 100),
                currency: 'INR',
                accept_partial: false,
                description: `Order ${order.orderId}`,
                customer: {
                    name: user.getFullName(),
                    contact: user.phone || '',
                },
                notify: {
                    sms: false,
                    email: false,
                },
                reminder_enable: false,
                notes: {
                    orderId: order._id.toString(),
                    razorpayOrderId: order.razorpayOrderId,
                },
                callback_url: `${config.telegram.webhookUrl.replace(/\/telegram$/, '')}/payment/success`,
                callback_method: 'get',
                expire_by: Math.floor(Date.now() / 1000) + 20 * 60, // 20 minutes to be safe (min 15 required)
            });

            order.paymentLink = paymentLink.short_url;
            order.razorpayPaymentLinkId = paymentLink.id;
            await order.save();

            logger.info(`Payment link generated for order: ${order.orderId}`);

            return paymentLink.short_url;
        } catch (error) {
            logger.error('Error generating payment link:', error);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(body, signature) {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', config.razorpay.webhookSecret)
                .update(JSON.stringify(body))
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            logger.error('Error verifying webhook signature:', error);
            return false;
        }
    }

    /**
     * Verify payment signature
     */
    verifyPaymentSignature(orderId, paymentId, signature) {
        try {
            const generated = crypto
                .createHmac('sha256', config.razorpay.keySecret)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            return generated === signature;
        } catch (error) {
            logger.error('Error verifying payment signature:', error);
            return false;
        }
    }

    /**
     * Verify payment link signature
     */
    verifyPaymentLinkSignature(params, signature) {
        try {
            const { razorpay_payment_link_id, razorpay_payment_link_reference_id, razorpay_payment_link_status, razorpay_payment_id } = params;
            const content = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
            const generated = crypto
                .createHmac('sha256', config.razorpay.keySecret)
                .update(content)
                .digest('hex');

            return generated === signature;
        } catch (error) {
            logger.error('Error verifying payment link signature:', error);
            return false;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(params) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_payment_link_id } = params;

            let order;
            let isValid = false;

            if (razorpay_order_id) {
                logger.info(`Handling payment success for Razorpay Order: ${razorpay_order_id}`);
                order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
                if (order) {
                    isValid = this.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
                }
            } else if (razorpay_payment_link_id) {
                logger.info(`Handling payment success for Razorpay Payment Link: ${razorpay_payment_link_id}`);
                order = await Order.findOne({ razorpayPaymentLinkId: razorpay_payment_link_id });
                if (order) {
                    isValid = this.verifyPaymentLinkSignature(params, razorpay_signature);
                }
            }

            if (!order) {
                logger.error('Order not found for payment');
                return null;
            }

            logger.info(`Signature verification result: ${isValid}`);

            if (!isValid) {
                logger.error(`Invalid payment signature for order: ${order.orderId}`);
                order.paymentStatus = 'failed';
                await order.save();
                return null;
            }

            // Update order
            order.razorpayPaymentId = razorpay_payment_id;
            order.razorpaySignature = razorpay_signature;
            order.paymentStatus = 'completed';
            order.expiresAt = null; // Remove expiry
            await order.save();

            logger.info(`Payment successful for order: ${order.orderId}`);

            return order;
        } catch (error) {
            logger.error('Error handling payment success:', error);
            throw error;
        }
    }

    /**
     * Handle payment failure
     */
    async handlePaymentFailure(razorpayOrderId, error) {
        try {
            const order = await Order.findOne({ razorpayOrderId });

            if (!order) {
                logger.error(`Order not found for Razorpay order: ${razorpayOrderId}`);
                return null;
            }

            order.paymentStatus = 'failed';
            await order.save();

            logger.info(`Payment failed for order: ${order.orderId}, error: ${error}`);

            return order;
        } catch (err) {
            logger.error('Error handling payment failure:', err);
            throw err;
        }
    }

    /**
     * Process refund
     */
    async processRefund(order, amount = null) {
        try {
            if (!order.razorpayPaymentId) {
                throw new Error('No payment ID found for refund');
            }

            const refundAmount = amount || order.total;

            const refund = await this.razorpay.payments.refund(order.razorpayPaymentId, {
                amount: Math.round(refundAmount * 100),
                notes: {
                    orderId: order._id.toString(),
                    reason: order.cancellationReason || 'Customer requested refund',
                },
            });

            order.paymentStatus = 'refunded';
            order.status = 'refunded';
            await order.save();

            logger.info(`Refund processed for order: ${order.orderId}, refund ID: ${refund.id}`);

            return refund;
        } catch (error) {
            logger.error('Error processing refund:', error);
            throw error;
        }
    }

    /**
     * Get payment details
     */
    async getPaymentDetails(paymentId) {
        try {
            return await this.razorpay.payments.fetch(paymentId);
        } catch (error) {
            logger.error('Error fetching payment details:', error);
            throw error;
        }
    }
}

module.exports = new PaymentService();
