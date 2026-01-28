const Notification = require('../models/Notification');

// Get all notifications with filters
exports.getNotifications = async (req, res) => {
    try {
        const {
            type,
            category,
            page = 1,
            limit = 20,
            search
        } = req.query;

        const filter = { isActive: true };

        if (type && type !== 'all') {
            filter.type = type;
        }

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notifications, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('metadata.orderId', 'orderNumber status')
                .populate('metadata.productId', 'name price')
                .lean(),
            Notification.countDocuments(filter)
        ]);

        // Calculate time ago for each notification
        const notificationsWithTimeAgo = notifications.map(notif => ({
            ...notif,
            id: notif._id,
            timeAgo: getTimeAgo(notif.createdAt)
        }));

        res.json({
            success: true,
            data: notificationsWithTimeAgo,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};

// Get notification stats
exports.getNotificationStats = async (req, res) => {
    try {
        const [total, unread, promo, order, system] = await Promise.all([
            Notification.countDocuments({ isActive: true }),
            Notification.countDocuments({ isActive: true, 'readBy.0': { $exists: false } }),
            Notification.countDocuments({ isActive: true, type: 'promo' }),
            Notification.countDocuments({ isActive: true, type: 'order' }),
            Notification.countDocuments({ isActive: true, type: 'system' })
        ]);

        res.json({
            success: true,
            data: { total, unread, promo, order, system }
        });
    } catch (error) {
        console.error('Get notification stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// Create a new notification
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, category, icon, isHighlighted, link, metadata, expiresAt } = req.body;

        const notification = new Notification({
            title,
            message,
            type: type || 'all',
            category: category || 'all',
            icon: icon || 'bell',
            isHighlighted: isHighlighted || false,
            link,
            metadata,
            expiresAt
        });

        await notification.save();

        res.status(201).json({
            success: true,
            data: notification,
            message: 'Notification created successfully'
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to create notification' });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.body.userId;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // Check if already read
        const alreadyRead = notification.readBy.some(
            r => r.userId && r.userId.toString() === userId?.toString()
        );

        if (!alreadyRead && userId) {
            notification.readBy.push({ userId, readAt: new Date() });
            await notification.save();
        }

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId;

        if (userId) {
            await Notification.updateMany(
                { isActive: true },
                { $addToSet: { readBy: { userId, readAt: new Date() } } }
            );
        }

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all as read' });
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notification' });
    }
};

// Bulk delete notifications
exports.bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body;

        await Notification.updateMany(
            { _id: { $in: ids } },
            { isActive: false }
        );

        res.json({ success: true, message: `${ids.length} notifications deleted` });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notifications' });
    }
};

// Helper function to get relative time
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;

    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Create sample notifications for demo
exports.seedNotifications = async (req, res) => {
    try {
        const sampleNotifications = [
            {
                title: 'Almost Gone',
                message: 'Limited-time offer! Enjoy up to 40% off on selected furniture. Don\'t miss out! Shop now before it\'s too late!',
                type: 'promo',
                category: 'buyer',
                icon: 'flame',
                isHighlighted: false
            },
            {
                title: 'Limited Offer! Claim $50.00 Voucher',
                message: 'Sign up now and enjoy a $50.00 voucher on your first purchase! Don\'t miss out.',
                type: 'promo',
                category: 'buyer',
                icon: 'gift',
                isHighlighted: true
            },
            {
                title: 'Unlock Your Exclusive Gift',
                message: 'Sign up now and enjoy a $50.00 voucher on your first purchase! Don\'t miss out.',
                type: 'promo',
                category: 'buyer',
                icon: 'gift',
                isHighlighted: true
            },
            {
                title: 'Order Confirmed',
                message: 'We\'re preparing your order and will notify you once it\'s shipped. Track your order status anytime through the app.',
                type: 'order',
                category: 'buyer',
                icon: 'package',
                isHighlighted: false
            },
            {
                title: 'Order Shipped',
                message: 'Great news! Your order has been shipped and is on its way to you. Expected delivery by 3 days. You can track your package.',
                type: 'order',
                category: 'buyer',
                icon: 'truck',
                isHighlighted: false
            },
            {
                title: 'Payment Received',
                message: 'Great news! The payment for your recent sale has been successfully processed. You can now check your balance.',
                type: 'payment',
                category: 'seller',
                icon: 'credit-card',
                isHighlighted: false
            }
        ];

        await Notification.insertMany(sampleNotifications);

        res.json({
            success: true,
            message: 'Sample notifications created successfully',
            count: sampleNotifications.length
        });
    } catch (error) {
        console.error('Seed notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to seed notifications' });
    }
};
