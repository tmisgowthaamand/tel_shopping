const express = require('express');
const router = express.Router();
const { userController } = require('../controllers');
const { authenticateAdmin, checkPermission } = require('../middleware');

// All user routes are protected
router.use(authenticateAdmin);
router.use(checkPermission('users'));

router.get('/', userController.getUsers);
router.get('/stats', userController.getStats);
router.get('/:id', userController.getUser);
router.post('/:id/blacklist', userController.blacklistUser);
router.post('/:id/unblacklist', userController.unblacklistUser);

router.post('/broadcast', userController.broadcastNotification);

module.exports = router;
