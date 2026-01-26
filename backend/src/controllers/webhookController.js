const { paymentService, orderService } = require('../services');
const { Order, User } = require('../models');
const { botService } = require('../bot');
const { addNotificationJob, addDeliveryAssignmentJob } = require('../jobs/queues');
const logger = require('../utils/logger');

/**
 * Handle Razorpay webhook
 */
exports.handleRazorpayWebhook = async (req, res) => {
    try {
        const event = req.body.event;
        const payload = req.body.payload;

        logger.info(`Razorpay webhook received: ${event}`);

        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(payload.payment.entity);
                break;

            case 'payment.failed':
                await handlePaymentFailed(payload.payment.entity);
                break;

            case 'payment_link.paid':
                await handlePaymentLinkPaid(payload.payment_link.entity);
                break;

            case 'refund.processed':
                await handleRefundProcessed(payload.refund.entity);
                break;

            default:
                logger.info(`Unhandled webhook event: ${event}`);
        }

        res.status(200).json({ status: 'ok' });
    } catch (error) {
        logger.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

/**
 * Handle payment captured
 */
async function handlePaymentCaptured(payment) {
    try {
        const order = await Order.findOne({
            razorpayOrderId: payment.order_id,
        }).populate('user');

        if (!order) {
            logger.warn(`Order not found for payment: ${payment.id}`);
            return;
        }

        if (order.paymentStatus === 'completed') {
            logger.info(`Payment already processed for order: ${order.orderId}`);
            return;
        }

        // Update order payment status
        order.razorpayPaymentId = payment.id;
        order.paymentStatus = 'completed';
        order.expiresAt = null;
        await order.save();

        // Confirm order (deduct stock, assign partner, notify, etc.)
        await orderService.confirmOrder(order._id);

        logger.info(`Payment captured for order: ${order.orderId}`);
    } catch (error) {
        logger.error('Handle payment captured error:', error);
    }
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(payment) {
    try {
        const order = await Order.findOne({
            razorpayOrderId: payment.order_id,
        }).populate('user');

        if (!order) {
            return;
        }

        order.paymentStatus = 'failed';
        await order.save();

        logger.info(`Payment failed for order: ${order.orderId}`);
    } catch (error) {
        logger.error('Handle payment failed error:', error);
    }
}

/**
 * Handle payment link paid
 */
async function handlePaymentLinkPaid(paymentLink) {
    try {
        const orderId = paymentLink.notes?.orderId;

        if (!orderId) {
            return;
        }

        const order = await Order.findById(orderId).populate('user');

        if (!order) {
            return;
        }

        if (order.paymentStatus === 'completed') {
            return;
        }

        order.paymentStatus = 'completed';
        order.expiresAt = null;
        await order.save();

        // Confirm order (deduct stock, assign partner, notify, etc.)
        await orderService.confirmOrder(order._id);

        logger.info(`Payment link paid for order: ${order.orderId}`);
    } catch (error) {
        logger.error('Handle payment link paid error:', error);
    }
}

/**
 * Handle refund processed
 */
async function handleRefundProcessed(refund) {
    try {
        const order = await Order.findOne({
            razorpayPaymentId: refund.payment_id,
        });

        if (!order) {
            return;
        }

        order.paymentStatus = 'refunded';
        order.status = 'refunded';
        await order.save();

        logger.info(`Refund processed for order: ${order.orderId}`);
    } catch (error) {
        logger.error('Handle refund processed error:', error);
    }
}

/**
 * Payment success callback (redirect from Razorpay)
 */
exports.paymentSuccess = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_payment_link_id } = req.query;
        logger.info('Payment success callback query:', req.query);

        if (!razorpay_payment_id || (!razorpay_order_id && !razorpay_payment_link_id)) {
            logger.warn('Missing required payment parameters');
            return res.redirect('/webhook/payment/failed');
        }

        const order = await paymentService.handlePaymentSuccess(req.query);

        if (order) {
            // Confirm order (deduct stock, assign partner, etc.)
            await orderService.confirmOrder(order._id);
            const botInfo = botService.getBotInfo();
            const botUsername = botInfo?.username || 'ATZStoreBot';
            const botUrl = `https://t.me/${botUsername}`;

            res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Successful</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #f4f7f6; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
            .success { color: #2ecc71; font-size: 32px; margin-bottom: 20px; }
            .btn { background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; font-weight: bold; }
            .timer { color: #888; margin-top: 20px; font-size: 14px; }
          </style>
          <script>
            setTimeout(function() {
              window.location.href = "${botUrl}";
            }, 3000);
          </script>
        </head>
        <body>
          <div class="card">
            <h1 class="success">✅ Payment Successful!</h1>
            <p>Order ID: <strong>${order.orderId}</strong></p>
            <p>Redirecting you back to Telegram...</p>
            <a href="${botUrl}" class="btn">Return to Telegram Now</a>
            <p class="timer">If not redirected, click the button above.</p>
          </div>
        </body>
        </html>
      `);
        } else {
            res.redirect('/webhook/payment/failed');
        }
    } catch (error) {
        logger.error('Payment success callback error:', error);
        res.redirect('/webhook/payment/failed');
    }
};

/**
 * Payment failed page
 */
exports.paymentFailed = async (req, res) => {
    const botInfo = botService.getBotInfo();
    const botUsername = botInfo?.username || 'ATZStoreBot';
    const botUrl = `https://t.me/${botUsername}`;

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Failed</title>
      <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #fdf2f2; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block; }
        .error { color: #e74c3c; font-size: 32px; margin-bottom: 20px; }
        .btn { background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="error">❌ Payment Failed</h1>
        <p>The payment could not be processed.</p>
        <p>Please try again from the Telegram bot.</p>
        <a href="${botUrl}" class="btn">Return to Telegram</a>
      </div>
    </body>
    </html>
  `);
};
