const { orderService, paymentService } = require('../services');
const { Order, User } = require('../models');
const { addNotificationJob } = require('../jobs/queues');
const logger = require('../utils/logger');

/**
 * Get all orders
 */
exports.getOrders = async (req, res) => {
    try {
        const { status, payment, page = 1, limit = 20, from, to } = req.query;

        const query = {};

        if (status) query.status = status;
        if (payment) query.paymentStatus = payment;
        if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from);
            if (to) query.createdAt.$lte = new Date(to);
        }

        const orders = await Order.find(query)
            .populate('user', 'firstName lastName username phone')
            .populate('deliveryPartner', 'name phone')
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        logger.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
};

/**
 * Get single order
 */
exports.getOrder = async (req, res) => {
    try {
        const order = await orderService.getOrder(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        logger.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
};

/**
 * Update order status
 */
exports.updateStatus = async (req, res) => {
    try {
        const { status, note } = req.body;
        const order = await orderService.updateOrderStatus(
            req.params.id,
            status,
            note,
            'admin'
        );

        // Notify user
        const user = await User.findById(order.user);
        if (user) {
            await addNotificationJob('order_status', user._id, { order });
        }

        res.json(order);
    } catch (error) {
        logger.error('Update order status error:', error);
        res.status(500).json({ error: error.message || 'Failed to update status' });
    }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const order = await orderService.cancelOrder(
            req.params.id,
            reason || 'Cancelled by admin',
            'admin'
        );

        // Notify user
        const user = await User.findById(order.user);
        if (user) {
            await addNotificationJob('auto_cancel', user._id, { order });
        }

        res.json(order);
    } catch (error) {
        logger.error('Cancel order error:', error);
        res.status(500).json({ error: error.message || 'Failed to cancel order' });
    }
};

/**
 * Process refund
 */
exports.refundOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const refund = await paymentService.processRefund(order, amount);
        res.json({ refund, order });
    } catch (error) {
        logger.error('Refund order error:', error);
        res.status(500).json({ error: error.message || 'Failed to process refund' });
    }
};

/**
 * Assign delivery partner manually
 */
exports.assignPartner = async (req, res) => {
    try {
        const { partnerId } = req.body;
        const { deliveryService } = require('../services');

        const { order, partner } = await deliveryService.acceptOrder(
            partnerId,
            req.params.id
        );

        // Notify user
        const user = await User.findById(order.user);
        if (user) {
            await addNotificationJob('delivery_assigned', user._id, { order, partner });
        }

        res.json({ order, partner });
    } catch (error) {
        logger.error('Assign partner error:', error);
        res.status(500).json({ error: error.message || 'Failed to assign partner' });
    }
};

/**
 * Get order stats
 */
exports.getStats = async (req, res) => {
    try {
        const { from, to } = req.query;

        const dateFilter = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);

        const [
            totalOrders,
            pendingOrders,
            confirmedOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue,
        ] = await Promise.all([
            Order.countDocuments(from || to ? { createdAt: dateFilter } : {}),
            Order.countDocuments({ status: 'pending', ...(from || to ? { createdAt: dateFilter } : {}) }),
            Order.countDocuments({ status: 'confirmed', ...(from || to ? { createdAt: dateFilter } : {}) }),
            Order.countDocuments({ status: 'delivered', ...(from || to ? { createdAt: dateFilter } : {}) }),
            Order.countDocuments({ status: 'cancelled', ...(from || to ? { createdAt: dateFilter } : {}) }),
            Order.aggregate([
                {
                    $match: {
                        status: 'delivered',
                        ...(from || to ? { createdAt: dateFilter } : {}),
                    },
                },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
        ]);

        res.json({
            totalOrders,
            pendingOrders,
            confirmedOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
        });
    } catch (error) {
        logger.error('Get order stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

/**
 * Get flagged orders
 */
exports.getFlaggedOrders = async (req, res) => {
    try {
        const orders = await Order.find({ isFraudFlagged: true })
            .populate('user', 'firstName lastName username phone orderStats')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        logger.error('Get flagged orders error:', error);
        res.status(500).json({ error: 'Failed to get flagged orders' });
    }
};
