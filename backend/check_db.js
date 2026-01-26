require('dotenv').config();
const connectDB = require('./src/config/database');
const { Category, Product, Admin, DeliveryPartner, User, Order } = require('./src/models');
const logger = require('./src/utils/logger');

async function check() {
    try {
        await connectDB();
        console.log('--- DB Content Check ---');
        console.log('Categories:', await Category.countDocuments());
        console.log('Products:', await Product.countDocuments());
        console.log('Users:', await User.countDocuments());
        console.log('Orders:', await Order.countDocuments());
        console.log('Delivery Partners:', await DeliveryPartner.countDocuments());
        console.log('Admins:', await Admin.countDocuments());
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

check();
