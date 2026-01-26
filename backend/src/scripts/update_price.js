require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { Product } = require('./backend/src/models');

async function updateProductPrice() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atz_store');
        console.log('Connected to database');

        const productName = "Story Books for Kids - Second Reader (Illustrated) (Set of 6 Books)";
        const product = await Product.findOne({ name: productName });

        if (product) {
            product.price = 210;
            product.discount = 50;
            // The pre-save hook will handle finalPrice calculation
            await product.save();
            console.log(`Successfully updated: ${product.name}`);
            console.log(`New Base Price: ₹${product.price}`);
            console.log(`New Discount: ${product.discount}%`);
            console.log(`New Final Price: ₹${product.finalPrice}`);
        } else {
            // Try fuzzy search if exact name fails
            const fuzzyProduct = await Product.findOne({ name: /Story Books for Kids/i });
            if (fuzzyProduct) {
                fuzzyProduct.price = 210;
                fuzzyProduct.discount = 50;
                await fuzzyProduct.save();
                console.log(`Successfully updated (fuzzy match): ${fuzzyProduct.name}`);
            } else {
                console.log('Product not found');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateProductPrice();
