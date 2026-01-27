const cloudinary = require('../utils/cloudinary');
const logger = require('../utils/logger');

class CloudinaryService {
    /**
     * Upload an image to Cloudinary
     * @param {string} filePath Local file path or URL
     * @param {string} folder Cloudinary folder name
     */
    async uploadImage(filePath, folder = 'atz-products') {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: folder,
                use_filename: true,
                unique_filename: true,
                resource_type: 'auto'
            });
            return {
                url: result.secure_url,
                publicId: result.public_id
            };
        } catch (error) {
            logger.error('Cloudinary upload error:', error);
            throw error;
        }
    }

    /**
     * Delete an image from Cloudinary
     * @param {string} publicId 
     */
    async deleteImage(publicId) {
        if (!publicId) return;
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            logger.error(`Cloudinary delete error for ${publicId}:`, error);
            // We don't necessarily want to throw here to avoid blocking DB operations
            return null;
        }
    }

    /**
     * Extract publicId from Cloudinary URL if it's not stored
     * @param {string} url 
     */
    extractPublicId(url) {
        if (!url || !url.includes('cloudinary.com')) return null;
        try {
            const parts = url.split('/');
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex === -1) return null;

            // Skip 'upload' and version (if present)
            let startIndex = uploadIndex + 1;
            if (parts[startIndex].startsWith('v') && !isNaN(parts[startIndex].substring(1))) {
                startIndex++;
            }

            const publicIdWithExt = parts.slice(startIndex).join('/');
            return publicIdWithExt.split('.')[0];
        } catch (e) {
            return null;
        }
    }
}

module.exports = new CloudinaryService();
