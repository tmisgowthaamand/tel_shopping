const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin } = require('../models');
const logger = require('../utils/logger');

/**
 * Authenticate admin JWT token
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, config.jwt.secret);

        const admin = await Admin.findById(decoded.id);

        if (!admin || !admin.isActive) {
            return res.status(401).json({ error: 'Invalid or inactive account' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        logger.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Check admin permissions
 */
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (req.admin.role === 'super_admin') {
            return next();
        }

        if (!req.admin.permissions[permission]) {
            return res.status(403).json({ error: 'Permission denied' });
        }

        next();
    };
};

/**
 * Verify Razorpay webhook signature
 */
const verifyRazorpayWebhook = (req, res, next) => {
    const { paymentService } = require('../services');

    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
    }

    const isValid = paymentService.verifyWebhookSignature(req.body, signature);

    if (!isValid) {
        logger.warn('Invalid Razorpay webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    next();
};

/**
 * Authenticate delivery partner JWT token
 */
const authenticatePartner = async (req, res, next) => {
    try {
        const { DeliveryPartner } = require('../models');
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);

        const partner = await DeliveryPartner.findById(decoded.id);

        if (!partner || !partner.isActive) {
            return res.status(401).json({ error: 'Invalid or inactive partner account' });
        }

        req.partner = partner;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        logger.error('Partner auth error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = {
    authenticateAdmin,
    authenticatePartner,
    checkPermission,
    verifyRazorpayWebhook,
};
