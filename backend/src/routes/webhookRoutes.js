const express = require('express');
const router = express.Router();
const { webhookController } = require('../controllers');
const { verifyRazorpayWebhook, webhookLimiter } = require('../middleware');

// Razorpay webhook (with signature verification)
router.post(
    '/razorpay',
    webhookLimiter,
    express.json(),
    verifyRazorpayWebhook,
    webhookController.handleRazorpayWebhook
);

// Payment success/failure callbacks
router.get('/payment/success', webhookController.paymentSuccess);
router.get('/payment/failed', webhookController.paymentFailed);

module.exports = router;
