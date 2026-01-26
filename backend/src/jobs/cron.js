const cron = require('node-cron');
const logger = require('../utils/logger');
const { Order, Cart, Product } = require('../models');
const { orderService, paymentService } = require('../services');

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
    // 1. Order Cleanup (Daily 2:00 AM) - Hide old delivered/cancelled orders
    cron.schedule('0 2 * * *', async () => {
        try {
            logger.info('Running Daily Order Cleanup...');
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            await Order.updateMany(
                { status: { $in: ['delivered', 'cancelled'] }, createdAt: { $lt: weekAgo } },
                { isVisible: false }
            );
            logger.info('Daily Order Cleanup completed.');
        } catch (error) {
            logger.error('Order Cleanup failed:', error);
        }
    });

    // 2. Cart Cleanup (Daily 3:00 AM) - Remove old cart items
    cron.schedule('0 3 * * *', async () => {
        try {
            logger.info('Running Daily Cart Cleanup...');
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            await Cart.deleteMany({ updatedAt: { $lt: dayAgo } });
            logger.info('Daily Cart Cleanup completed.');
        } catch (error) {
            logger.error('Cart Cleanup failed:', error);
        }
    });

    // 3. Reset Daily Stats (Daily 12:00 AM)
    cron.schedule('0 0 * * *', async () => {
        try {
            logger.info('Resetting Daily Statistics...');
            // Logic to reset daily stats if stored in DB
            logger.info('Daily Statistics reset.');
        } catch (error) {
            logger.error('Stats reset failed:', error);
        }
    });

    // 4. Refund Scheduler (Every 5 minutes) - Process pending refunds
    cron.schedule('*/5 * * * *', async () => {
        try {
            const pendingRefundOrders = await Order.find({
                paymentStatus: 'refund_processing'
            });

            for (const order of pendingRefundOrders) {
                await paymentService.processRefund(order).catch(e => {
                    logger.error(`Refund failed for order ${order.orderId}:`, e.message);
                });
            }
        } catch (error) {
            logger.error('Refund scheduler failed:', error);
        }
    });

    logger.info('Cron jobs initialized');
};

module.exports = { initCronJobs };
