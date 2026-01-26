require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const { Category, Product } = require('./src/models');

async function check() {
    await connectDB();
    const cat = await Category.findOne({ slug: 'electronics' });
    const count = await Product.countDocuments({ category: cat._id });
    console.log(`Electronics Product Count: ${count}`);
    const products = await Product.find({ category: cat._id }).select('name');
    products.forEach(p => console.log(`- ${p.name}`));
    process.exit(0);
}
check();
