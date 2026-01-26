const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authenticateAdmin, checkPermission, authLimiter } = require('../middleware');

// Public routes
router.post('/login', authLimiter, authController.login);

// Protected routes
router.get('/me', authenticateAdmin, authController.getMe);
router.post('/change-password', authenticateAdmin, authController.changePassword);

// Super admin only
router.get('/admins', authenticateAdmin, checkPermission('settings'), authController.listAdmins);
router.post('/admins', authenticateAdmin, checkPermission('settings'), authController.createAdmin);

module.exports = router;
