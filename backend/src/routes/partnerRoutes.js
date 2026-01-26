const express = require('express');
const router = express.Router();
const { partnerController } = require('../controllers');
const { authenticateAdmin, checkPermission } = require('../middleware');

// All partner routes are protected
router.use(authenticateAdmin);
router.use(checkPermission('partners'));

router.get('/', partnerController.getPartners);
router.get('/stats', partnerController.getStats);
router.get('/nearby', partnerController.getNearby);
router.get('/:id', partnerController.getPartner);
router.post('/', partnerController.createPartner);
router.put('/:id', partnerController.updatePartner);
router.patch('/:id/toggle', partnerController.toggleActive);
router.patch('/:id/verify', partnerController.verifyDocuments);
router.post('/:id/payout', partnerController.processPayout);

module.exports = router;
