const mongoose = require('mongoose');
const config = require('../config');
const { Product } = require('../models');
const cloudinaryService = require('./cloudinaryService');
const logger = require('../utils/logger');

/**
 * Migration script to ensure all product images are stored in Cloudinary
 * and have associated publicIds in the database.
 */
async function syncImagesToCloudinary() {
    try {
        logger.info('Starting Cloudinary image synchronization...');

        // Connect if not connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.mongodb.uri);
            logger.info('Connected to MongoDB');
        }

        const products = await Product.find({});
        logger.info(`Found ${products.length} products to check.`);

        let updatedCount = 0;
        let uploadCount = 0;

        for (const product of products) {
            let hasChanges = false;

            for (let i = 0; i < product.images.length; i++) {
                const img = product.images[i];

                // 1. If it's already a Cloudinary URL but missing publicId, try to extract it
                if (img.url.includes('cloudinary.com') && !img.publicId) {
                    const extractedId = cloudinaryService.extractPublicId(img.url);
                    if (extractedId) {
                        img.publicId = extractedId;
                        hasChanges = true;
                        logger.info(`Extracted publicId for ${product.name}: ${extractedId}`);
                    }
                }

                // 2. If it's NOT a Cloudinary URL, upload it
                if (!img.url.includes('cloudinary.com')) {
                    logger.info(`Uploading external image for ${product.name}: ${img.url}`);
                    try {
                        const result = await cloudinaryService.uploadImage(img.url);
                        img.url = result.url;
                        img.publicId = result.publicId;
                        hasChanges = true;
                        uploadCount++;
                    } catch (uploadErr) {
                        logger.error(`Failed to upload image for ${product.name}: ${uploadErr.message}`);
                    }
                }
            }

            if (hasChanges) {
                await product.save();
                updatedCount++;
            }
        }

        logger.info(`Synchronization complete!`);
        logger.info(`Updated products: ${updatedCount}`);
        logger.info(`New uploads items: ${uploadCount}`);

    } catch (error) {
        logger.error('Sync script error:', error);
    }
}

if (require.main === module) {
    syncImagesToCloudinary().then(() => {
        logger.info('Done.');
        process.exit(0);
    });
}

module.exports = syncImagesToCloudinary;
