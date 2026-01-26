const express = require('express');
const router = express.Router();
const { orderController } = require('../controllers');
const { authenticateAdmin, checkPermission } = require('../middleware');

// All order routes are protected
router.use(authenticateAdmin);

router.get('/', checkPermission('orders'), orderController.getOrders);
router.get('/stats', checkPermission('orders'), orderController.getStats);
router.get('/flagged', checkPermission('orders'), orderController.getFlaggedOrders);
router.get('/:id', checkPermission('orders'), orderController.getOrder);
router.patch('/:id/status', checkPermission('orders'), orderController.updateStatus);
router.post('/:id/cancel', checkPermission('orders'), orderController.cancelOrder);
router.post('/:id/refund', checkPermission('orders'), orderController.refundOrder);
router.post('/:id/assign-partner', checkPermission('orders'), orderController.assignPartner);

module.exports = router;
