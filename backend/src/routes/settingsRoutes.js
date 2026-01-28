const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const Settings = require('../models/Settings');

// Get maintenance status
router.get('/maintenance', authenticateAdmin, async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: 'maintenance_mode' });
        res.json({ enabled: setting ? setting.value : false });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update maintenance status
router.post('/maintenance', authenticateAdmin, async (req, res) => {
    try {
        const { enabled } = req.body;

        let setting = await Settings.findOne({ key: 'maintenance_mode' });

        if (setting) {
            setting.value = enabled;
            setting.updatedBy = req.admin._id;
            await setting.save();
        } else {
            setting = await Settings.create({
                key: 'maintenance_mode',
                value: enabled,
                description: 'Global bot maintenance mode',
                updatedBy: req.admin._id
            });
        }

        res.json({ enabled: setting.value });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
