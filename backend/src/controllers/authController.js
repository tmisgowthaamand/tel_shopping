const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Admin login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await admin.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!admin.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Generate token
        const token = jwt.sign({ id: admin._id, role: admin.role }, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        });

        // Update last login
        await admin.updateLastLogin();

        logger.info(`Admin logged in: ${admin.email}`);

        res.json({
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                permissions: admin.permissions,
            },
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * Get current admin
 */
exports.getMe = async (req, res) => {
    try {
        const admin = req.admin;

        res.json({
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions,
            lastLogin: admin.lastLogin,
        });
    } catch (error) {
        logger.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get admin info' });
    }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = req.admin;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const isMatch = await admin.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        admin.password = newPassword;
        await admin.save();

        logger.info(`Admin changed password: ${admin.email}`);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

/**
 * List all admins (super_admin only)
 */
exports.listAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password -refreshTokens');
        res.json(admins);
    } catch (error) {
        logger.error('List admins error:', error);
        res.status(500).json({ error: 'Failed to list admins' });
    }
};

/**
 * Create admin (super_admin only)
 */
exports.createAdmin = async (req, res) => {
    try {
        const { email, password, name, role, permissions } = req.body;

        const existing = await Admin.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const admin = await Admin.create({
            email: email.toLowerCase(),
            password,
            name,
            role: role || 'admin',
            permissions: permissions || {},
        });

        logger.info(`New admin created: ${admin.email} by ${req.admin.email}`);

        res.status(201).json({
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
        });
    } catch (error) {
        logger.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
};
