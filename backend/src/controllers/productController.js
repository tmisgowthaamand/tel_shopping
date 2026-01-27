const { productService, aiService } = require('../services');
const { Product, Category } = require('../models');
const logger = require('../utils/logger');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

/**
 * Get all products
 */
exports.getProducts = async (req, res) => {
    try {
        const { category, page = 1, limit = 20, search, active, featured } = req.query;

        let query = {};

        // Active status filter
        if (active !== undefined) {
            query.isActive = active === 'true';
        } else {
            query.isActive = true;
        }

        // Featured filter
        if (featured === 'true' || featured === true) {
            query.isFeatured = true;
        }

        // Search filter
        if (search) {
            query.$text = { $search: search };
        }

        // Category filter
        if (category && category !== 'all') {
            query.category = category;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        let mongoQuery = Product.find(query).populate('category');

        if (search) {
            mongoQuery = mongoQuery.sort({ score: { $meta: 'textScore' } });
        } else {
            mongoQuery = mongoQuery.sort({ createdAt: -1 });
        }

        const [products, total] = await Promise.all([
            mongoQuery.skip(skip).limit(limitNum),
            Product.countDocuments(query)
        ]);

        res.json({
            products,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        logger.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
};

/**
 * Get single product
 */
exports.getProduct = async (req, res) => {
    try {
        const product = await productService.getProduct(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        logger.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
};

/**
 * Create product
 */
exports.createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(req.body);
        res.status(201).json(product);
    } catch (error) {
        logger.error('Create product error:', error);
        res.status(500).json({ error: error.message || 'Failed to create product' });
    }
};

/**
 * Bulk create products
 */
exports.bulkCreateProducts = async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Body must be an array of products' });
        }

        const products = await Product.insertMany(req.body);
        logger.info(`Bulk created ${products.length} products`);
        res.status(201).json({
            message: `Successfully created ${products.length} products`,
            count: products.length
        });
    } catch (error) {
        logger.error('Bulk create products error:', error);
        res.status(500).json({ error: error.message || 'Failed to bulk create products' });
    }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body);
        res.json(product);
    } catch (error) {
        logger.error('Update product error:', error);
        res.status(500).json({ error: error.message || 'Failed to update product' });
    }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res) => {
    try {
        await productService.deleteProduct(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        logger.error('Delete product error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
};

/**
 * Update stock
 */
exports.updateStock = async (req, res) => {
    try {
        const { stock } = req.body;
        const product = await productService.updateStock(req.params.id, stock);
        res.json(product);
    } catch (error) {
        logger.error('Update stock error:', error);
        res.status(500).json({ error: error.message || 'Failed to update stock' });
    }
};

/**
 * Get low stock products
 */
exports.getLowStock = async (req, res) => {
    try {
        const { threshold = 10 } = req.query;
        const products = await productService.getLowStockProducts(parseInt(threshold));
        res.json(products);
    } catch (error) {
        logger.error('Get low stock error:', error);
        res.status(500).json({ error: 'Failed to get low stock products' });
    }
};

/**
 * Get product stats
 */
exports.getStats = async (req, res) => {
    try {
        const stats = await productService.getProductStats();
        res.json(stats);
    } catch (error) {
        logger.error('Get product stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

// CATEGORY ENDPOINTS

/**
 * Get all categories
 */
exports.getCategories = async (req, res) => {
    try {
        const { active } = req.query;
        const categories = await productService.getCategories(active !== 'false');
        res.json(categories);
    } catch (error) {
        logger.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
};

/**
 * Get single category
 */
exports.getCategory = async (req, res) => {
    try {
        const category = await productService.getCategory(req.params.id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        logger.error('Get category error:', error);
        res.status(500).json({ error: 'Failed to get category' });
    }
};

/**
 * Create category
 */
exports.createCategory = async (req, res) => {
    try {
        const category = await productService.createCategory(req.body);
        res.status(201).json(category);
    } catch (error) {
        logger.error('Create category error:', error);
        res.status(500).json({ error: error.message || 'Failed to create category' });
    }
};

/**
 * Update category
 */
exports.updateCategory = async (req, res) => {
    try {
        const category = await productService.updateCategory(req.params.id, req.body);
        res.json(category);
    } catch (error) {
        logger.error('Update category error:', error);
        res.status(500).json({ error: error.message || 'Failed to update category' });
    }
};

/**
 * Delete category
 */
exports.deleteCategory = async (req, res) => {
    try {
        await productService.deleteCategory(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        logger.error('Delete category error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete category' });
    }
};
/**
 * Generate AI description
 */
exports.generateAIDescription = async (req, res) => {
    try {
        const { name, categoryId } = req.body;
        if (!name) return res.status(400).json({ error: 'Product name is required' });

        let categoryName = 'General';
        if (categoryId) {
            const category = await productService.getCategory(categoryId);
            if (category) categoryName = category.name;
        }

        const description = await aiService.generateProductDescription(name, categoryName);
        res.json({ description });
    } catch (error) {
        logger.error('Generate AI description error:', error);
        res.status(500).json({ error: 'Failed to generate AI description' });
    }
};

/**
 * Upload product image
 */
exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'atz-products',
            use_filename: true,
            unique_filename: true,
        });

        // Delete local file after upload
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
        });
    } catch (error) {
        logger.error('Upload image error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload image' });
    }
};

/**
 * Trigger Cloudinary synchronization
 */
exports.syncCloudinary = async (req, res) => {
    try {
        const syncImagesToCloudinary = require('../services/cloudinarySync');
        // Run in background
        syncImagesToCloudinary();
        res.json({ message: 'Synchronization started in background' });
    } catch (error) {
        logger.error('Sync Cloudinary error:', error);
        res.status(500).json({ error: 'Failed to start synchronization' });
    }
};

/**
 * Delete product image
 */
exports.deleteImage = async (req, res) => {
    try {
        const { id, imageId } = req.params;
        const product = await productService.deleteProductImage(id, imageId);
        res.json(product);
    } catch (error) {
        logger.error('Delete image error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete image' });
    }
};
