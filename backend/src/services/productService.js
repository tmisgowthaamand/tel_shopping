const { Product, Category, Cart } = require('../models');
const logger = require('../utils/logger');

class ProductService {
    /**
     * Get all categories
     */
    async getCategories(activeOnly = true) {
        try {
            const query = activeOnly ? { isActive: true } : {};
            return Category.find(query).sort({ sortOrder: 1, name: 1 });
        } catch (error) {
            logger.error('Error getting categories:', error);
            throw error;
        }
    }

    /**
     * Get category by ID or slug
     */
    async getCategory(identifier) {
        try {
            return Category.findOne({
                $or: [{ _id: identifier }, { slug: identifier }],
            });
        } catch (error) {
            logger.error('Error getting category:', error);
            throw error;
        }
    }

    /**
     * Get products by category
     */
    async getProductsByCategory(categoryId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;

            const products = await Product.find({
                category: categoryId,
                isActive: true,
            })
                .sort({ isFeatured: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Product.countDocuments({
                category: categoryId,
                isActive: true,
            });

            return {
                products,
                total,
                page,
                pages: Math.ceil(total / limit),
            };
        } catch (error) {
            logger.error('Error getting products by category:', error);
            throw error;
        }
    }

    /**
     * Get featured products
     */
    async getFeaturedProducts(limit = 5) {
        try {
            return Product.find({
                isActive: true,
                isFeatured: true,
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('category');
        } catch (error) {
            logger.error('Error getting featured products:', error);
            throw error;
        }
    }

    /**
     * Get product by ID
     */
    async getProduct(productId) {
        try {
            return Product.findById(productId).populate('category');
        } catch (error) {
            logger.error('Error getting product:', error);
            throw error;
        }
    }

    /**
     * Search products
     */
    async searchProducts(query, limit = 10) {
        try {
            return Product.find({
                isActive: true,
                $text: { $search: query },
            })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .populate('category');
        } catch (error) {
            logger.error('Error searching products:', error);
            throw error;
        }
    }

    /**
     * Create product
     */
    async createProduct(productData) {
        try {
            const product = await Product.create(productData);
            logger.info(`Product created: ${product.name}`);
            return product;
        } catch (error) {
            logger.error('Error creating product:', error);
            throw error;
        }
    }

    /**
     * Update product
     */
    async updateProduct(productId, updateData) {
        try {
            const product = await Product.findByIdAndUpdate(productId, updateData, {
                new: true,
                runValidators: true,
            });

            if (!product) {
                throw new Error('Product not found');
            }

            logger.info(`Product updated: ${product.name}`);
            return product;
        } catch (error) {
            logger.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product (soft delete)
     */
    async deleteProduct(productId) {
        try {
            const product = await Product.findByIdAndUpdate(productId, {
                isActive: false,
            });

            if (!product) {
                throw new Error('Product not found');
            }

            logger.info(`Product deleted: ${product.name}`);
            return product;
        } catch (error) {
            logger.error('Error deleting product:', error);
            throw error;
        }
    }

    /**
     * Update stock
     */
    async updateStock(productId, quantity) {
        try {
            const product = await Product.findById(productId);

            if (!product) {
                throw new Error('Product not found');
            }

            product.stock = quantity;
            await product.save();

            logger.info(`Stock updated for ${product.name}: ${quantity}`);
            return product;
        } catch (error) {
            logger.error('Error updating stock:', error);
            throw error;
        }
    }

    /**
     * Create category
     */
    async createCategory(categoryData) {
        try {
            const category = await Category.create(categoryData);
            logger.info(`Category created: ${category.name}`);
            return category;
        } catch (error) {
            logger.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Update category
     */
    async updateCategory(categoryId, updateData) {
        try {
            const category = await Category.findByIdAndUpdate(categoryId, updateData, {
                new: true,
                runValidators: true,
            });

            if (!category) {
                throw new Error('Category not found');
            }

            logger.info(`Category updated: ${category.name}`);
            return category;
        } catch (error) {
            logger.error('Error updating category:', error);
            throw error;
        }
    }

    /**
     * Delete category
     */
    async deleteCategory(categoryId) {
        try {
            // Check if products exist in category
            const productCount = await Product.countDocuments({ category: categoryId });

            if (productCount > 0) {
                throw new Error('Cannot delete category with products');
            }

            const category = await Category.findByIdAndDelete(categoryId);

            if (!category) {
                throw new Error('Category not found');
            }

            logger.info(`Category deleted: ${category.name}`);
            return category;
        } catch (error) {
            logger.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Get low stock products
     */
    async getLowStockProducts(threshold = 10) {
        try {
            return Product.find({
                isActive: true,
                stock: { $lte: threshold },
            }).sort({ stock: 1 });
        } catch (error) {
            logger.error('Error getting low stock products:', error);
            throw error;
        }
    }

    /**
     * Get product stats
     */
    async getProductStats() {
        try {
            const [totalProducts, activeProducts, outOfStock, lowStock, categories] =
                await Promise.all([
                    Product.countDocuments(),
                    Product.countDocuments({ isActive: true }),
                    Product.countDocuments({ isActive: true, stock: 0 }),
                    Product.countDocuments({ isActive: true, stock: { $lte: 10, $gt: 0 } }),
                    Category.countDocuments({ isActive: true }),
                ]);

            return {
                totalProducts,
                activeProducts,
                outOfStock,
                lowStock,
                categories,
            };
        } catch (error) {
            logger.error('Error getting product stats:', error);
            throw error;
        }
    }
}

module.exports = new ProductService();
