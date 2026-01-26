require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { Product } = require('../models');
const connectDB = require('../config/database');

const updates = [
    { name: "Pepe Jeans Men's Regular Fit Track Pant", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Pepe Jeans Men's Mid‑Rise Track Pant", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Pepe Jeans Men's Activewear Trackpants", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Jockey Men's Super Combed Cotton Trackpant", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Jockey 9500 Men Trackpant", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Campus Sutra Men's Paisley Flora Shirt", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Campus Sutra Men's Brushed Buffalo Check Shirt", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Campus Sutra Men's Ash Grey Pavement Shirt", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Campus Sutra Men's Self‑Design Creased Striped Shirt", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Campus Sutra Men's Pleat‑Creased Shirt", sizes: ['S', 'M', 'L', 'XL'] },
    { name: "Campus Sutra Men's Cube‑Textured Shirt", sizes: ['S', 'M', 'L', 'XL'] }
];

async function update() {
    try {
        await connectDB();
        console.log('Connected to database');
        for (const up of updates) {
            const result = await Product.updateOne({ name: up.name }, { $set: { sizes: up.sizes } });
            if (result.modifiedCount > 0) {
                console.log(`Updated sizes for: ${up.name}`);
            } else {
                console.log(`No changes for: ${up.name}`);
            }
        }
        console.log('Successfully completed updates');
        process.exit(0);
    } catch (error) {
        console.error('Error updating:', error);
        process.exit(1);
    }
}

update();
