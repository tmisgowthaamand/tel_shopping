const { productService } = require('../services');
const logger = require('../utils/logger');

/**
 * Get all products
 */
exports.getProducts = async (req, res) => {
    try {
        const { category, page = 1, limit = 20, search, active } = req.query;

        let products;
        let total;

        if (search) {
            products = await productService.searchProducts(search, parseInt(limit));
            total = products.length;
        } else if (category) {
            const result = await productService.getProductsByCategory(
                category,
                parseInt(page),
                parseInt(limit)
            );
            products = result.products;
            total = result.total;
        } else {
            const { Product } = require('../models');
            // Default to showing only active products unless explicitly requested
            const query = active !== undefined ? { isActive: active === 'true' } : { isActive: true };
            products = await Product.find(query)
                .populate('category')
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });
            total = await Product.countDocuments(query);
        }

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
