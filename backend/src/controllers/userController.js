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
        const { message, imageUrl, productId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const stats = await botService.broadcastMessage(message, { imageUrl, productId });

        res.json({
            message: 'Broadcast completed',
            stats
        });
    } catch (error) {
        logger.error('Broadcast error:', error);
        res.status(500).json({ error: 'Failed to send broadcast' });
    }
};

/**
 * Send message to a specific user
 */
exports.sendMessageToUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, imageUrl, productId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.telegramId) {
            return res.status(400).json({ error: 'User has no Telegram ID' });
        }

        // Send message via Telegram
        const bot = botService.getBot();
        if (!bot) {
            return res.status(500).json({ error: 'Bot not initialized' });
        }

        const { Markup } = require('telegraf');

        let keyboard = null;
        if (productId) {
            keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('🛒 Add to Cart', `add_to_cart_${productId}`),
                    Markup.button.callback('🛍️ View Product', `product_${productId}`)
                ]
            ]);
        }

        try {
            if (imageUrl) {
                await bot.telegram.sendPhoto(user.telegramId, imageUrl, {
                    caption: message,
                    parse_mode: 'HTML',
                    ...(keyboard ? keyboard : {})
                });
            } else {
                await bot.telegram.sendMessage(user.telegramId, message, {
                    parse_mode: 'HTML',
                    ...(keyboard ? keyboard : {})
                });
            }

            logger.info(`Message sent to user ${user._id} (${user.telegramId})`);

            res.json({
                success: true,
                message: 'Message sent successfully',
                recipient: {
                    id: user._id,
                    name: user.getFullName(),
                    telegramId: user.telegramId
                }
            });
        } catch (telegramError) {
            logger.error(`Failed to send message to ${user.telegramId}:`, telegramError.message);
            res.status(500).json({
                error: 'Failed to send message via Telegram',
                details: telegramError.message
            });
        }
    } catch (error) {
        logger.error('Send message to user error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

