/**
 * Upload welcome banner to Cloudinary
 * Run once: node src/scripts/uploadBanner.js
 */
require('dotenv').config();
const cloudinary = require('../utils/cloudinary');
const path = require('path');

async function uploadBanner() {
    try {
        const bannerPath = path.join(__dirname, '..', 'assets', 'welcome_banner.png');

        const result = await cloudinary.uploader.upload(bannerPath, {
            folder: 'atz-store',
            public_id: 'welcome_banner',
            overwrite: true,
            resource_type: 'image'
        });

        console.log('✅ Banner uploaded successfully!');
        console.log('URL:', result.secure_url);
        console.log('\nAdd this URL to your .env file:');
        console.log(`WELCOME_BANNER_URL=${result.secure_url}`);

        return result.secure_url;
    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        process.exit(1);
    }
}

uploadBanner();
