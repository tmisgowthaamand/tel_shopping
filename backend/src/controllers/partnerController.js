const { DeliveryPartner } = require('../models');
const { deliveryService } = require('../services');
const logger = require('../utils/logger');

/**
 * Get all delivery partners
 */
exports.getPartners = async (req, res) => {
    try {
        const { active, online, available, page = 1, limit = 20 } = req.query;

        const query = {};
        if (active !== undefined) query.isActive = active === 'true';
        if (online !== undefined) query.isOnline = online === 'true';
        if (available !== undefined) query.isAvailable = available === 'true';

        const partners = await DeliveryPartner.find(query)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await DeliveryPartner.countDocuments(query);

        res.json({
            partners,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        logger.error('Get partners error:', error);
        res.status(500).json({ error: 'Failed to get partners' });
    }
};

/**
 * Get single partner
 */
exports.getPartner = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.params.id)
            .populate('currentOrder');

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        res.json(partner);
    } catch (error) {
        logger.error('Get partner error:', error);
        res.status(500).json({ error: 'Failed to get partner' });
    }
};

/**
 * Create partner
 */
exports.createPartner = async (req, res) => {
    try {
        const partner = await DeliveryPartner.create(req.body);
        res.status(201).json(partner);
    } catch (error) {
        logger.error('Create partner error:', error);
        res.status(500).json({ error: error.message || 'Failed to create partner' });
    }
};

/**
 * Update partner
 */
exports.updatePartner = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        res.json(partner);
    } catch (error) {
        logger.error('Update partner error:', error);
        res.status(500).json({ error: error.message || 'Failed to update partner' });
    }
};

/**
 * Activate/deactivate partner
 */
exports.toggleActive = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.params.id);

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        partner.isActive = !partner.isActive;
        if (!partner.isActive) {
            partner.isOnline = false;
            partner.isAvailable = false;
        }
        await partner.save();

        res.json(partner);
    } catch (error) {
        logger.error('Toggle partner error:', error);
        res.status(500).json({ error: 'Failed to toggle partner status' });
    }
};

/**
 * Verify partner documents
 */
exports.verifyDocuments = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.params.id);

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        partner.documents.verified = true;
        partner.isActive = true;
        await partner.save();

        res.json(partner);
    } catch (error) {
        logger.error('Verify documents error:', error);
        res.status(500).json({ error: 'Failed to verify documents' });
    }
};

/**
 * Get nearby partners
 */
exports.getNearby = async (req, res) => {
    try {
        const { lat, lng, radius = 5 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }

        const partners = await deliveryService.findNearbyPartners(
            parseFloat(lng),
            parseFloat(lat),
            parseFloat(radius)
        );

        res.json(partners);
    } catch (error) {
        logger.error('Get nearby partners error:', error);
        res.status(500).json({ error: 'Failed to get nearby partners' });
    }
};

/**
 * Get partner stats
 */
exports.getStats = async (req, res) => {
    try {
        const [total, active, online, available] = await Promise.all([
            DeliveryPartner.countDocuments(),
            DeliveryPartner.countDocuments({ isActive: true }),
            DeliveryPartner.countDocuments({ isOnline: true }),
            DeliveryPartner.countDocuments({ isAvailable: true }),
        ]);

        res.json({ total, active, online, available });
    } catch (error) {
        logger.error('Get partner stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

/**
 * Process payout
 */
exports.processPayout = async (req, res) => {
    try {
        const { amount } = req.body;
        const partner = await DeliveryPartner.findById(req.params.id);

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        if (amount > partner.stats.pendingEarnings) {
            return res.status(400).json({ error: 'Amount exceeds pending earnings' });
        }

        partner.stats.pendingEarnings -= amount;

        // Mark earnings as paid
        partner.earnings
            .filter((e) => e.status === 'pending')
            .slice(0, 10) // Process in batches
            .forEach((e) => {
                e.status = 'paid';
            });

        await partner.save();

        res.json({ message: 'Payout processed', partner });
    } catch (error) {
        logger.error('Process payout error:', error);
        res.status(500).json({ error: 'Failed to process payout' });
    }
};
