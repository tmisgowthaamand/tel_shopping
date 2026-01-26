require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

async function fixIndex() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        console.log('Checking indexes...');
        const indexes = await collection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name));

        if (indexes.some(i => i.name === 'phone_1')) {
            console.log('Dropping offending phone_1 index...');
            await collection.dropIndex('phone_1');
            console.log('Index dropped successfully');
        } else {
            console.log('phone_1 index not found, nothing to drop.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fixing index:', error);
        process.exit(1);
    }
}

fixIndex();
