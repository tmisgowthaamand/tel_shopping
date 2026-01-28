const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { adminAuth, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for read tracking)
router.get('/', optionalAuth, notificationController.getNotifications);
router.get('/stats', notificationController.getNotificationStats);

// Admin routes
router.post('/', adminAuth, notificationController.createNotification);
router.post('/seed', adminAuth, notificationController.seedNotifications);
router.delete('/:id', adminAuth, notificationController.deleteNotification);
router.post('/bulk-delete', adminAuth, notificationController.bulkDelete);

// Read tracking
router.post('/:id/read', optionalAuth, notificationController.markAsRead);
router.post('/mark-all-read', optionalAuth, notificationController.markAllAsRead);

module.exports = router;
