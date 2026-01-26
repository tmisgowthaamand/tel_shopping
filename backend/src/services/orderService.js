const { Order, Product, Cart, User, DeliveryPartner } = require('../models');
const paymentService = require('./paymentService');
const deliveryService = require('./deliveryService');
const config = require('../config');
const logger = require('../utils/logger');
const googleSheetsService = require('./googleSheetsService');
const emailService = require('./emailService');

class OrderService {
    /**
     * Create order from cart
     */
    async createOrder(userId, deliveryAddress, paymentMethod, notes = '') {
        try {
            const user = await User.findById(userId);
            const cart = await Cart.getOrCreate(userId);

            if (!cart.items.length) {
                throw new Error('Cart is empty');
            }

            // Validate stock
            await this.validateStock(cart.items);

            // Create order items
            const orderItems = cart.items.map((item) => ({
                product: item.product._id,
                productName: item.product.name,
                productImage: item.product.getPrimaryImage(),
                quantity: item.quantity,
                price: item.product.price,
                discount: item.product.discount,
                finalPrice: item.product.finalPrice,
                total: item.product.finalPrice * item.quantity,
            }));

            // Calculate delivery fee based on location
            const deliveryFee = this.calculateDeliveryFee(deliveryAddress);

            // Create order
            const order = await Order.create({
                user: userId,
                items: orderItems,
                subtotal: cart.subtotal,
                discount: cart.discount,
                deliveryFee,
                total: cart.total + deliveryFee,
                paymentMethod,
                deliveryAddress: {
                    address: deliveryAddress.address,
                    location: {
                        type: 'Point',
                        coordinates: deliveryAddress.coordinates,
                    },
                },
                notes,
            });

            // Reserve stock
            await this.reserveStock(cart.items);

            // Check fraud flags
            await this.checkFraudFlags(user, order);

            // Process based on payment method
            if (paymentMethod === 'razorpay') {
                // Create Razorpay order
                await paymentService.createRazorpayOrder(order);
                const paymentLink = await paymentService.generatePaymentLink(order, user);
                order.paymentLink = paymentLink;
            } else if (paymentMethod === 'cod') {
                // COD - confirm immediately
                order.status = 'confirmed';
                order.paymentStatus = 'pending'; // Will be collected on delivery
                order.expiresAt = null;
            }

            await order.save();

            // Clear cart
            await cart.clear();

            // Update user stats
            user.orderStats.totalOrders += 1;
            if (paymentMethod === 'cod') {
                user.orderStats.codOrders += 1;
            }
            await user.save();

            logger.info(`Order created: ${order.orderId}`);

            // Sync to Google Sheets
            googleSheetsService.syncOrder(order).catch(e => logger.error('Async sync error:', e));

            // Notify Admin
            const { addNotificationJob } = require('../jobs/queues');
            await addNotificationJob('admin_new_order', user._id, { order });

            return order;
        } catch (error) {
            logger.error('Error creating order:', error);
            throw error;
        }
    }

    /**
     * Validate stock availability
     */
    async validateStock(items) {
        for (const item of items) {
            const product = await Product.findById(item.product._id || item.product);
            if (!product) {
                throw new Error(`Product not found: ${item.product}`);
            }
            if (product.availableStock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }
        }
    }

    /**
     * Reserve stock for order
     */
    async reserveStock(items) {
        for (const item of items) {
            const product = await Product.findById(item.product._id || item.product);
            await product.reserveStock(item.quantity);
        }
    }

    /**
     * Release reserved stock
     */
    async releaseStock(items) {
        for (const item of items) {
            const product = await Product.findById(item.product._id || item.product);
            if (product) {
                await product.releaseStock(item.quantity);
            }
        }
    }

    /**
     * Deduct stock on confirmation
     */
    async deductStock(items) {
        for (const item of items) {
            const product = await Product.findById(item.product._id || item.product);
            await product.deductStock(item.quantity);
        }
    }

    /**
     * Calculate delivery fee
     */
    calculateDeliveryFee(deliveryAddress) {
        // Simple flat fee for now
        // Could be distance-based or zone-based
        return 40;
    }

    /**
     * Check fraud flags
     */
    async checkFraudFlags(user, order) {
        const flags = [];

        // Check COD abuse
        if (order.paymentMethod === 'cod') {
            const codRatio = user.orderStats.codOrders / Math.max(1, user.orderStats.totalOrders);
            const cancelRatio = user.orderStats.cancelledOrders / Math.max(1, user.orderStats.totalOrders);

            if (codRatio > 0.8 && user.orderStats.totalOrders > 3) {
                flags.push('High COD usage');
            }

            if (cancelRatio > 0.3 && user.orderStats.totalOrders > 3) {
                flags.push('High cancellation rate');
            }

            // Check recent orders
            const recentOrders = await Order.countDocuments({
                user: user._id,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            });

            if (recentOrders >= 5) {
                flags.push('Too many orders in 24h');
            }
        }

        if (flags.length > 0) {
            order.isFraudFlagged = true;
            order.fraudReason = flags.join(', ');
            await order.save();
        }
    }

    /**
     * Confirm order (after payment success)
     */
    async confirmOrder(orderId) {
        try {
            const order = await Order.findById(orderId).populate('user');

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status !== 'pending') {
                logger.info(`Order ${order.orderId} already confirmed or in process (Status: ${order.status})`);
                return order;
            }

            // Deduct stock
            await this.deductStock(order.items);

            // Update order status
            order.status = 'confirmed';
            order.expiresAt = null;
            await order.save();

            // Zepto-style Ultra-Fast Simulation (10 Min Delivery)
            // Confirmed -> Packing (1 min) -> Out for delivery (3 min) -> Delivered (10 min)

            // 1. Packing (1 minute later)
            setTimeout(async () => {
                const o = await Order.findById(orderId);
                if (o && o.status === 'confirmed') {
                    await this.updateOrderStatus(orderId, 'preparing', 'Store partner is picking and packing your items');
                }
            }, 60000);

            // 2. Out for Delivery (3 minutes later)
            setTimeout(async () => {
                const o = await Order.findById(orderId);
                if (o && (o.status === 'preparing' || o.status === 'confirmed')) {
                    await this.updateOrderStatus(orderId, 'out_for_delivery', 'Delivery partner is arriving at speed to your location');
                }
            }, 3 * 60000);

            // 3. Delivered (10 minutes later)
            setTimeout(async () => {
                const o = await Order.findById(orderId);
                if (o && o.status === 'out_for_delivery') {
                    await this.updateOrderStatus(orderId, 'delivered', 'Order delivered successfully in 10 minutes!');
                }
            }, 10 * 60000);

            // Assign delivery partner
            const { addNotificationJob, addDeliveryAssignmentJob } = require('../jobs/queues');

            // Notify user via Bot
            await addNotificationJob('payment_success', order.user._id, { order });

            // Send confirmation email
            emailService.sendOrderConfirmation(order, order.user).catch(e => logger.error('Email error:', e));

            // Assign delivery partner via job
            await addDeliveryAssignmentJob(order._id);

            logger.info(`Order confirmed & tracking simulation started: ${order.orderId}`);

            return order;
        } catch (error) {
            logger.error('Error confirming order:', error);
            throw error;
        }
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId, reason = 'User requested', cancelledBy = 'system') {
        try {
            const order = await Order.findById(orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
                throw new Error('Cannot cancel this order');
            }

            // Release stock
            await this.releaseStock(order.items);

            // Update order
            order.status = 'cancelled';
            order.cancelledAt = new Date();
            order.cancellationReason = reason;
            await order.save();

            // Update user stats
            const user = await User.findById(order.user);
            if (user) {
                user.orderStats.cancelledOrders += 1;
                await user.save();
            }

            // Process refund if payment was made
            if (order.paymentStatus === 'completed' && order.razorpayPaymentId) {
                await paymentService.processRefund(order);
            }

            logger.info(`Order cancelled: ${order.orderId}, reason: ${reason}`);

            return order;
        } catch (error) {
            logger.error('Error cancelling order:', error);
            throw error;
        }
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId, status, note = '', updatedBy = 'system') {
        try {
            const order = await Order.findById(orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            await order.updateStatus(status, note, updatedBy);

            // Update user stats on completion
            if (status === 'delivered') {
                const user = await User.findById(order.user);
                if (user) {
                    user.orderStats.completedOrders += 1;
                    user.orderStats.totalSpent += order.total;
                    await user.save();
                }

                // Update delivery partner earnings
                if (order.deliveryPartner) {
                    const earnings = deliveryService.calculateDeliveryEarnings(0); // Add distance logic if needed
                    const partner = await DeliveryPartner.findById(order.deliveryPartner);
                    if (partner) {
                        await partner.completeDelivery(order._id, earnings);
                        logger.info(`Partner ${partner.name} earnings updated for order ${order.orderId}`);
                    }
                }
            }

            logger.info(`Order status updated: ${order.orderId} -> ${status}`);

            // Sync status to Google Sheets
            googleSheetsService.updateOrderStatus(order.orderId, status).catch(e => logger.error('Async sync error:', e));

            // Notify Admin
            const { addNotificationJob } = require('../jobs/queues');
            addNotificationJob('admin_status_update', order.user, { order }).catch(e => logger.error('Admin notify failed', e));

            return order;
        } catch (error) {
            logger.error('Error updating order status:', error);
            throw error;
        }
    }

    /**
     * Get order by ID
     */
    async getOrder(orderId) {
        return Order.findById(orderId)
            .populate('user')
            .populate('deliveryPartner')
            .populate('items.product');
    }

    /**
     * Get orders for user
     */
    async getUserOrders(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('deliveryPartner');

        const total = await Order.countDocuments({ user: userId });

        return {
            orders,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Get expired unpaid orders
     */
    async getExpiredOrders() {
        return Order.getExpiredUnpaidOrders();
    }

    /**
     * Auto-cancel expired orders
     */
    async autoCancelExpiredOrders() {
        try {
            const expiredOrders = await this.getExpiredOrders();

            for (const order of expiredOrders) {
                await this.cancelOrder(
                    order._id,
                    'Auto-cancelled: Payment not received within 15 minutes',
                    'system'
                );
                logger.info(`Auto-cancelled expired order: ${order.orderId}`);
            }

            return expiredOrders.length;
        } catch (error) {
            logger.error('Error auto-cancelling orders:', error);
            throw error;
        }
    }
}

module.exports = new OrderService();
