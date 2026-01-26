const { Cart } = require('../models');
const productService = require('./productService');
const logger = require('../utils/logger');

class CartService {
    /**
     * Get or create cart for user
     */
    async getCart(userId) {
        try {
            const cart = await Cart.getOrCreate(userId);
            await cart.populate('items.product');
            return cart;
        } catch (error) {
            logger.error('Error getting cart:', error);
            throw error;
        }
    }

    /**
     * Add item to cart
     */
    async addToCart(userId, productId, quantity = 1) {
        try {
            const product = await productService.getProduct(productId);

            if (!product) {
                throw new Error('Product not found');
            }

            if (!product.isActive) {
                throw new Error('Product is not available');
            }

            if (product.availableStock < quantity) {
                throw new Error(`Only ${product.availableStock} items available`);
            }

            const cart = await Cart.getOrCreate(userId);
            await cart.addItem(productId, quantity, product.price, product.discount);

            await cart.populate('items.product');

            logger.info(`Added ${quantity}x ${product.name} to cart for user ${userId}`);

            return cart;
        } catch (error) {
            logger.error('Error adding to cart:', error);
            throw error;
        }
    }

    /**
     * Update item quantity
     */
    async updateQuantity(userId, productId, quantity) {
        try {
            const cart = await Cart.getOrCreate(userId);

            if (quantity > 0) {
                const product = await productService.getProduct(productId);
                if (product.availableStock < quantity) {
                    throw new Error(`Only ${product.availableStock} items available`);
                }
            }

            await cart.updateItemQuantity(productId, quantity);
            await cart.populate('items.product');

            logger.info(`Updated quantity for product ${productId} in cart for user ${userId}`);

            return cart;
        } catch (error) {
            logger.error('Error updating cart quantity:', error);
            throw error;
        }
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(userId, productId) {
        try {
            const cart = await Cart.getOrCreate(userId);
            await cart.removeItem(productId);
            await cart.populate('items.product');

            logger.info(`Removed product ${productId} from cart for user ${userId}`);

            return cart;
        } catch (error) {
            logger.error('Error removing from cart:', error);
            throw error;
        }
    }

    /**
     * Clear cart
     */
    async clearCart(userId) {
        try {
            const cart = await Cart.getOrCreate(userId);
            await cart.clear();

            logger.info(`Cleared cart for user ${userId}`);

            return cart;
        } catch (error) {
            logger.error('Error clearing cart:', error);
            throw error;
        }
    }

    /**
     * Validate cart items
     */
    async validateCart(userId) {
        try {
            const cart = await Cart.getOrCreate(userId);
            await cart.populate('items.product');

            const issues = [];

            for (const item of cart.items) {
                if (!item.product) {
                    issues.push({ productId: item.product, issue: 'Product not found' });
                    continue;
                }

                if (!item.product.isActive) {
                    issues.push({ productId: item.product._id, issue: 'Product unavailable' });
                    continue;
                }

                if (item.product.availableStock < item.quantity) {
                    issues.push({
                        productId: item.product._id,
                        issue: `Only ${item.product.availableStock} available`,
                        maxQuantity: item.product.availableStock,
                    });
                }
            }

            // Recalculate totals
            await cart.calculateTotals();
            await cart.save();

            return {
                cart,
                isValid: issues.length === 0,
                issues,
            };
        } catch (error) {
            logger.error('Error validating cart:', error);
            throw error;
        }
    }

    /**
     * Get cart summary for display
     */
    async getCartSummary(userId) {
        try {
            const cart = await Cart.getOrCreate(userId);
            await cart.populate('items.product');

            if (cart.items.length === 0) {
                return {
                    isEmpty: true,
                    itemCount: 0,
                    items: [],
                    subtotal: 0,
                    discount: 0,
                    total: 0,
                };
            }

            const items = cart.items
                .filter(item => item.product !== null && item.product !== undefined)
                .map((item) => ({
                    productId: item.product._id,
                    name: item.product.name,
                    image: typeof item.product.getPrimaryImage === 'function' ? item.product.getPrimaryImage() : null,
                    price: item.product.price,
                    discount: item.product.discount,
                    finalPrice: item.product.finalPrice,
                    quantity: item.quantity,
                    itemTotal: item.product.finalPrice * item.quantity,
                    inStock: item.product.availableStock >= item.quantity,
                }));

            return {
                isEmpty: false,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
                items,
                subtotal: cart.subtotal,
                discount: cart.discount,
                total: cart.total,
            };
        } catch (error) {
            logger.error('Error getting cart summary:', error);
            throw error;
        }
    }
}

module.exports = new CartService();
