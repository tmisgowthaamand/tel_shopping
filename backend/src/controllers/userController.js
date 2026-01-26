const { User } = require('../models');
const logger = require('../utils/logger');
const { botService } = require('../bot');

/**
 * Get all users
 */
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, blacklisted } = req.query;

        const query = {};
        if (blacklisted !== undefined) query.isBlacklisted = blacklisted === 'true';

        const users = await User.find(query)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.json({
            users,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

/**
 * Get single user
 */
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
};

/**
 * Blacklist user
 */
exports.blacklistUser = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isBlacklisted = true;
        user.blacklistReason = reason || 'Admin action';
        await user.save();

        res.json(user);
    } catch (error) {
        logger.error('Blacklist user error:', error);
        res.status(500).json({ error: 'Failed to blacklist user' });
    }
};

/**
 * Remove from blacklist
 */
exports.unblacklistUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.isBlacklisted = false;
        user.blacklistReason = null;
        await user.save();

        res.json(user);
    } catch (error) {
        logger.error('Unblacklist user error:', error);
        res.status(500).json({ error: 'Failed to unblacklist user' });
    }
};

/**
 * Get user stats
 */
exports.getStats = async (req, res) => {
    try {
        const [total, blacklisted, active] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isBlacklisted: true }),
            User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            }),
        ]);

        res.json({ total, blacklisted, active30Days: active });
    } catch (error) {
        logger.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

/**
 * Broadcast notification to all users
 */
exports.broadcastNotification = async (req, res) => {
    try {
        const { message, imageUrl } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const stats = await botService.broadcastMessage(message, { imageUrl });

        res.json({
            message: 'Broadcast completed',
            stats
        });
    } catch (error) {
        logger.error('Broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
};
