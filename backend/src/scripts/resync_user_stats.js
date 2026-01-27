const mongoose = require('mongoose');
const config = require('../config');
const { User, Order } = require('../models');
const logger = require('../utils/logger');

async function resyncStats() {
    try {
        console.log('Starting User Stats Resync...');
        await mongoose.connect(config.mongodb.uri);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Processing ${users.length} users...`);

        for (const user of users) {
            const userOrders = await Order.find({ user: user._id });

            let totalOrders = userOrders.length;
            let completedOrders = 0;
            let cancelledOrders = 0;
            let codOrders = 0;
            let totalSpent = 0;

            userOrders.forEach(order => {
                if (order.status === 'delivered') completedOrders++;
                if (order.status === 'cancelled') cancelledOrders++;
                if (order.paymentMethod === 'cod') codOrders++;

                // Spent = Paid online OR Delivered COD
                if (
                    (order.paymentMethod === 'razorpay' && order.paymentStatus === 'completed') ||
                    (order.paymentMethod === 'cod' && order.status === 'delivered')
                ) {
                    totalSpent += order.total;
                }
            });

            user.orderStats = {
                totalOrders,
                completedOrders,
                cancelledOrders,
                codOrders,
                totalSpent: Math.round(totalSpent * 100) / 100
            };

            await user.save();
            console.log(`Updated stats for user ${user.telegramId} (${user.firstName}): ${totalSpent}`);
        }

        console.log('Resync completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Resync failed:', error);
        process.exit(1);
    }
}

resyncStats();
