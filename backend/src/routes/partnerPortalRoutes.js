const express = require('express');
const router = express.Router();
const { partnerController } = require('../controllers');
const { authenticatePartner } = require('../middleware');

// Public route for partner login
router.post('/login', partnerController.login);

// Protected routes for partners
router.use(authenticatePartner);

router.get('/orders', partnerController.getAssignedOrders);
router.post('/orders/update', partnerController.updateOrderFromPortal);
router.get('/me', (req, res) => res.json(req.partner));

module.exports = router;
