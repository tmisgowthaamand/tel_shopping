const { Product, Category, Cart } = require('../models');
const logger = require('../utils/logger');
const cloudinaryService = require('./cloudinaryService');

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
            // Validate if productId is a valid MongoDB ObjectId
            const mongoose = require('mongoose');
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                logger.warn(`Invalid product ID format: ${productId}`);
                return null;
            }
            return Product.findById(productId).populate('category');
        } catch (error) {
            logger.error('Error getting product:', error);
            throw error;
        }
    }

    /**
     * Search products with regex fallback for better fuzzy matching
     */
    async searchProducts(query, limit = 10) {
        try {
            // Try standard text search first (using MongoDB text index)
            let products = await Product.find({
                isActive: true,
                $text: { $search: query },
            })
                .sort({ score: { $meta: 'textScore' } })
                .limit(limit)
                .populate('category');

            // If no results or very few, try regex matching for better "fuzzy" feel
            if (products.length < 3) {
                const searchTerms = query.split(/\s+/).filter(t => t.length >= 2);

                // Create a regex that matches any of the terms or the whole string
                // Use word boundaries for better precision on short terms
                const regexPatterns = searchTerms.map(t => {
                    if (t.length <= 5) {
                        return new RegExp(`\\b${t}`, 'i'); // Matches "pant" in "pants" but not "elephant"
                    }
                    return new RegExp(t, 'i');
                });

                const regexProducts = await Product.find({
                    _id: { $nin: products.map(p => p._id) }, // Don't duplicate
                    isActive: true,
                    $or: [
                        { name: { $regex: `\\b${query}`, $options: 'i' } },
                        { name: { $in: regexPatterns } },
                        { tags: { $in: regexPatterns } }
                    ]
                })
                    .limit(limit - products.length)
                    .populate('category');

                products = [...products, ...regexProducts];
            }

            return products;
        } catch (error) {
            logger.error('Error searching products:', error);
            throw error;
        }
    }

    /**
     * Get related products based on category
     */
    async getRelatedProducts(productId, limit = 5) {
        try {
            const product = await Product.findById(productId);
            if (!product) return [];

            return Product.find({
                _id: { $ne: productId },
                category: product.category,
                isActive: true
            })
                .limit(limit)
                .populate('category');
        } catch (error) {
            logger.error('Error getting related products:', error);
            return [];
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
            const product = await Product.findById(productId);

            if (!product) {
                throw new Error('Product not found');
            }

            // Update product fields
            Object.keys(updateData).forEach((key) => {
                product[key] = updateData[key];
            });

            await product.save();

            logger.info(`Product updated: ${product.name}`);
            return product;
        } catch (error) {
            logger.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product
     * @param {string} productId 
     * @param {boolean} hardDelete If true, permanently removes from DB and Cloudinary
     */
    async deleteProduct(productId, hardDelete = false) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            if (hardDelete) {
                // Delete all images from Cloudinary first
                for (const img of product.images) {
                    if (img.publicId) {
                        await cloudinaryService.deleteImage(img.publicId);
                    }
                }
                await Product.findByIdAndDelete(productId);
                logger.info(`Product permanently deleted: ${product.name}`);
            } else {
                product.isActive = false;
                await product.save();
                logger.info(`Product soft deleted: ${product.name}`);
            }

            return product;
        } catch (error) {
            logger.error('Error deleting product:', error);
            throw error;
        }
    }

    /**
     * Delete a specific image from a product
     */
    async deleteProductImage(productId, imageId) {
        try {
            const product = await Product.findById(productId);
            if (!product) throw new Error('Product not found');

            const imageIndex = product.images.findIndex(img => img._id.toString() === imageId.toString());
            if (imageIndex === -1) throw new Error('Image not found');

            const image = product.images[imageIndex];

            // Delete from Cloudinary if publicId exists
            if (image.publicId) {
                await cloudinaryService.deleteImage(image.publicId);
            }

            // Remove from array
            product.images.splice(imageIndex, 1);
            await product.save();

            return product;
        } catch (error) {
            logger.error('Error deleting product image:', error);
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
            const stats = await Product.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        totalStock: { $sum: "$stock" },
                        totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
                        outOfStock: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
                        lowStock: { $sum: { $cond: [{ $and: [{ $lte: ["$stock", 10] }, { $gt: ["$stock", 0] }] }, 1, 0] } },
                        featuredCount: { $sum: { $cond: [{ $eq: ["$isFeatured", true] }, 1, 0] } }
                    }
                }
            ]);

            const categoryCount = await Category.countDocuments({ isActive: true });

            const result = stats[0] || { totalProducts: 0, totalStock: 0, totalValue: 0, outOfStock: 0, lowStock: 0 };

            return {
                ...result,
                categories: categoryCount
            };
        } catch (error) {
            logger.error('Error getting product stats:', error);
            throw error;
        }
    }
}

module.exports = new ProductService();
