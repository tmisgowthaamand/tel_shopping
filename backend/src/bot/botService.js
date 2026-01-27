const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { User, Order, DeliveryPartner } = require('../models');
const { productService, cartService, orderService, mapsService, aiService } = require('../services');

class BotService {
    constructor() {
        this.bot = null;
        this.botInfo = null;
    }

    /**
     * Initialize bot
     */
    async initialize() {
        this.bot = new Telegraf(config.telegram.botToken);

        // Fetch bot info (username etc)
        try {
            this.botInfo = await this.bot.telegram.getMe();
            logger.info(`Bot initialized as @${this.botInfo.username}`);
        } catch (e) {
            logger.error('Failed to fetch bot info:', e.message);
        }

        // Register handlers
        this.registerMiddleware();
        this.registerCommands();
        this.registerActions();
        this.registerHandlers();

        // Register the command menu (the button next to the text input)
        await this.setBotCommands();

        logger.info('Telegram bot initialized');
    }

    /**
     * Broadcast message to all users
     */
    async broadcastMessage(message, options = {}) {
        const users = await User.find({ isBlacklisted: false });
        const results = {
            total: users.length,
            success: 0,
            failed: 0,
            errors: []
        };

        for (const user of users) {
            try {
                let keyboard = null;
                if (options.productId) {
                    keyboard = Markup.inlineKeyboard([
                        [
                            Markup.button.callback('🛒 Add to Cart', `add_to_cart_${options.productId}`),
                            Markup.button.callback('🛍️ Shop Now', `product_${options.productId}`)
                        ]
                    ]);
                }

                if (options.imageUrl) {
                    await this.bot.telegram.sendPhoto(user.telegramId, options.imageUrl, {
                        caption: message,
                        parse_mode: 'HTML',
                        ...(keyboard ? keyboard : {})
                    });
                } else {
                    await this.bot.telegram.sendMessage(user.telegramId, message, {
                        parse_mode: 'HTML',
                        ...(keyboard ? keyboard : {})
                    });
                }
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ userId: user._id, error: error.message });
                logger.error(`Failed to send broadcast to ${user.telegramId}:`, error.message);
            }
        }

        return results;
    }

    /**
     * Get bot info
     */
    getBotInfo() {
        return this.botInfo;
    }

    /**
     * Get bot instance
     */
    getBot() {
        return this.bot;
    }

    /**
     * Register middleware
     */
    registerMiddleware() {
        this.bot.use(async (ctx, next) => {
            try {
                if (ctx.from && !ctx.from.is_bot) {
                    const user = await User.findOrCreateByTelegramId(ctx.from);
                    ctx.user = user;

                    if (!user) {
                        logger.error(`MIDDLEWARE FAILURE: User.findOrCreateByTelegramId returned ${typeof user} for ID ${ctx.from.id}`);
                    }
                }
                return next();
            } catch (error) {
                const tgId = ctx.from ? ctx.from.id : 'unknown';
                logger.error(`CRITICAL MIDDLEWARE ERROR for user ${tgId}:`, error);

                if (ctx.chat) {
                    await ctx.reply('⚠️ Issue loading your profile. Please try /start again.').catch(() => { });
                }
            }
        });

        // Error handling
        this.bot.catch((err, ctx) => {
            logger.error('Bot error:', err);
            ctx.reply('Sorry, something went wrong. Please try again.');
        });
    }

    /**
     * Register commands
     */
    registerCommands() {
        // /start command
        this.bot.start(async (ctx) => {
            await this.handleStart(ctx);
        });

        // /help command
        this.bot.help(async (ctx) => {
            await this.handleHelp(ctx);
        });

        // /menu command
        this.bot.command('menu', async (ctx) => {
            await this.showMainMenu(ctx);
        });

        // /cart command
        this.bot.command('cart', async (ctx) => {
            await this.showCart(ctx);
        });

        // /orders command
        this.bot.command('orders', async (ctx) => {
            await this.showOrders(ctx);
        });

        // /track command
        this.bot.command('track', async (ctx) => {
            await this.showActiveOrder(ctx);
        });

        // /browse command
        this.bot.command('browse', async (ctx) => {
            await this.showCategories(ctx);
        });

        // /featured command
        this.bot.command('featured', async (ctx) => {
            await this.showFeaturedProducts(ctx);
        });

        // /search command
        this.bot.command('search', async (ctx) => {
            await ctx.replyWithMarkdown(`🔍 *How to search:* \n\nType @${this.botInfo.username} followed by a product name in any chat to search our catalog! \n\nExample: \`@${this.botInfo.username} colgate\``);
        });

        // /exit and /end commands
        this.bot.command(['exit', 'end'], async (ctx) => {
            await this.handleExit(ctx);
        });
    }

    /**
     * Set the bot command menu (visible next to the attachment icon)
     */
    async setBotCommands() {
        try {
            await this.bot.telegram.setMyCommands([
                { command: 'start', description: '🚀 Start Shopping' },
                { command: 'menu', description: '🏠 Main Menu' },
                { command: 'browse', description: '🛒 Browse Categories' },
                { command: 'featured', description: '⭐ Featured Products' },
                { command: 'cart', description: '🛍️ View My Cart' },
                { command: 'orders', description: '📦 My Orders' },
                { command: 'track', description: '📍 Track Active Order' },
                { command: 'search', description: '🔍 Search Product' },
                { command: 'help', description: '📚 Help & Assistance' },
                { command: 'exit', description: '❌ Close Assistant' },
            ]);
            logger.info('Telegram bot command menu updated');
        } catch (error) {
            logger.error('Failed to set bot commands:', error.message);
        }
    }

    /**
     * Register callback actions
     */
    registerActions() {
        // Main menu actions
        this.bot.action('show_categories', async (ctx) => {
            await this.showCategories(ctx);
        });

        this.bot.action('show_featured', async (ctx) => {
            await this.showFeaturedProducts(ctx);
        });

        this.bot.action('show_cart', async (ctx) => {
            await this.showCart(ctx);
        });

        this.bot.action('show_orders', async (ctx) => {
            await this.showOrders(ctx);
        });

        this.bot.action('show_active_order', async (ctx) => {
            await this.showActiveOrder(ctx);
        });

        this.bot.action('show_help', async (ctx) => {
            await this.handleHelp(ctx);
        });

        // Category selection
        this.bot.action(/^category_(.+)$/, async (ctx) => {
            const categoryId = ctx.match[1];
            await this.showCategoryProducts(ctx, categoryId);
        });

        // Product actions
        this.bot.action(/^product_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.showProduct(ctx, productId);
        });

        // Add view command handler for media groups
        this.bot.hears(/^\/view_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.showProduct(ctx, productId);
        });

        this.bot.action(/^add_to_cart_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.addToCart(ctx, productId);
        });

        this.bot.action(/^select_size_(.+)_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            const size = ctx.match[2];
            await this.addToCart(ctx, productId, size);
        });

        this.bot.action(/^buy_now_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.buyNow(ctx, productId);
        });

        this.bot.action(/^buy_now_size_(.+)_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            const size = ctx.match[2];
            await this.buyNow(ctx, productId, size);
        });

        // Quantity selection
        this.bot.action(/^qty_(.+)_(\d+)$/, async (ctx) => {
            const productId = ctx.match[1];
            const quantity = parseInt(ctx.match[2]);
            await this.handleQuantitySelection(ctx, productId, quantity);
        });

        // Cart actions
        this.bot.action(/^cart_add_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.updateCartQuantity(ctx, productId, 1);
        });

        this.bot.action(/^cart_sub_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.updateCartQuantity(ctx, productId, -1);
        });

        this.bot.action(/^cart_remove_(.+)$/, async (ctx) => {
            const productId = ctx.match[1];
            await this.removeFromCart(ctx, productId);
        });

        this.bot.action('clear_cart', async (ctx) => {
            await this.clearCart(ctx);
        });

        this.bot.action('checkout', async (ctx) => {
            await this.startCheckout(ctx);
        });

        // Address actions
        this.bot.action('use_saved_address', async (ctx) => {
            await this.useSavedAddress(ctx);
        });

        this.bot.action('enter_new_address', async (ctx) => {
            await this.promptNewAddress(ctx);
        });

        // Payment method selection
        this.bot.action('pay_razorpay', async (ctx) => {
            await this.selectPaymentMethod(ctx, 'razorpay');
        });

        this.bot.action('pay_cod', async (ctx) => {
            await this.selectPaymentMethod(ctx, 'cod');
        });

        // Order actions
        this.bot.action(/^order_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1].trim();
            await this.showOrderDetails(ctx, orderId);
        });

        this.bot.action(/^retry_payment_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1].trim();
            await this.retryPaymentAction(ctx, orderId);
        });

        this.bot.action(/^cancel_order_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1].trim();
            await this.cancelOrder(ctx, orderId);
        });

        // Navigation
        this.bot.action('back_to_menu', async (ctx) => {
            await this.showMainMenu(ctx);
        });

        this.bot.action(/^page_(.+)_(\d+)$/, async (ctx) => {
            const type = ctx.match[1];
            const page = parseInt(ctx.match[2]);
            if (type.startsWith('cat_')) {
                await this.showCategoryProducts(ctx, type.slice(4), page);
            }
        });
    }

    /**
     * Register message handlers
     */
    registerHandlers() {
        // Location handler
        this.bot.on('location', async (ctx) => {
            await this.handleLocation(ctx);
        });

        // Text handler
        this.bot.on('text', async (ctx) => {
            await this.handleText(ctx);
        });

        // Voice handler
        this.bot.on('voice', async (ctx) => {
            await this.handleVoice(ctx);
        });

        // Contact handler
        this.bot.on('contact', async (ctx) => {
            await this.handleContact(ctx);
        });

        // Inline query handler
        this.bot.on('inline_query', async (ctx) => {
            await this.handleInlineQuery(ctx);
        });
    }

    /**
     * Optimize and Clean image URL for Telegram
     * Uses Cloudinary magic to resize and compress for fast loading
     */
    optimizeImageUrl(url, options = { width: 500, quality: 'eco' }) {
        if (!url) return null;
        try {
            // 1. Cloudinary Optimization
            if (url.includes('cloudinary.com')) {
                const parts = url.split('/upload/');
                if (parts.length === 2) {
                    return `${parts[0]}/upload/f_auto,q_auto:${options.quality},w_${options.width}/${parts[1]}`;
                }
            }

            // 2. Unsplash Optimization (Very common in our catalog)
            if (url.includes('images.unsplash.com')) {
                const baseUrl = url.split('?')[0];
                return `${baseUrl}?w=${options.width}&q=70&auto=format&fit=crop`;
            }

            // 3. Shopify Optimization
            if (url.includes('cdn.shopify.com')) {
                return url.split('?')[0].replace(/(_\d+x\d+)?\.(jpg|png|webp)/, `_${options.width}x.$2`);
            }

            // 4. Generic URL Optimization (append parameters if it's a known service or just clean it)
            if (url.includes('?')) {
                const [base, query] = url.split('?');
                // If it already has sizing params, try to override them
                if (query.includes('width=') || query.includes('w=')) {
                    return `${base}?w=${options.width}&q=60`;
                }
            }

            return url;
        } catch (e) {
            return url;
        }
    }

    /**
     * Handle /start command
     */
    async handleStart(ctx) {
        let user = ctx.user;

        // Forced recovery if user is still missing
        if (!user && ctx.from) {
            try {
                logger.info(`START RECOVERY: Explicit call for ${ctx.from.id}`);
                user = await User.findOrCreateByTelegramId(ctx.from);
                ctx.user = user;
            } catch (e) {
                logger.error(`START RECOVERY FAILED: ${e.message}`);
            }
        }

        if (!user) {
            logger.error(`HALT: No user object even after recovery. From: ${JSON.stringify(ctx.from)}`);
            return ctx.reply('⚠️ Failed to load account. Please ensure you have a Telegram username set in your profile and try /start again.');
        }

        const welcomeMessage = `
� *ATZ Store Commands:*
/start - Start shopping
/menu - Show main menu
/browse - Browse categories
/featured - Featured products
/cart - View your cart
/orders - View your orders
/track - Track active order
/search - Search for products
/exit - Close assistant
/help - Show this help

🛍️ *Welcome to ATZ Store!* 👋

Hello ${user.getFullName()}! I'm your personal shopping assistant.

What would you like to do today?
    `.trim();

        await ctx.replyWithMarkdown(
            welcomeMessage,
            Markup.inlineKeyboard([
                [Markup.button.callback('📚 Help & Assistance', 'show_help')],
                [Markup.button.callback('🛒 Browse Categories', 'show_categories')],
                [Markup.button.callback('⭐ Featured Products', 'show_featured')],
                [Markup.button.callback('🛍️ My Cart', 'show_cart')],
                [Markup.button.callback('📦 My Orders', 'show_orders')],
                [Markup.button.callback('📍 Track Active Order', 'show_active_order')],
            ])
        );

        // Update user state
        user.currentState = 'idle';
        await user.save();
    }

    /**
     * Handle /help command
     */
    async handleHelp(ctx) {
        const helpText = `
📚 * ATZ Store Help *

* Commands:*
/start - Start shopping
            / menu - Show main menu
                / browse - Browse categories
                    / featured - Featured products
                        / cart - View your cart
                            / orders - View your orders
                                / track - Track active order
                                    / search - Search for products
                                        / exit - Close assistant
                                        / help - Show this help

                                            * How to shop:*
                                                1. Browse categories or featured products
        2. Tap on a product to view details
        3. Add items to cart
        4. Checkout with your address
        5. Pay via Razorpay or choose COD
        6. Track your order in real - time!

            * Need assistance ?*
                Contact us at support @atzstore.com
                    `.trim();

        await ctx.replyWithMarkdown(helpText);
    }

    /**
     * Handle /exit and /end commands
     */
    async handleExit(ctx) {
        const user = ctx.user;
        user.currentState = 'idle';
        user.sessionData = {};
        await user.save();

        const goodbyeMessage = `
🙏 *Thank you for visiting ATZ Store!* ✨

We hope you found everything you were looking for. 

🛍️ Feel free to come back anytime by typing /start.
👋 Have a great day!
    `.trim();

        await ctx.replyWithMarkdown(goodbyeMessage, Markup.removeKeyboard());
    }

    /**
     * Show main menu
     */
    async showMainMenu(ctx) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const menuMessage = `
🏠 *Main Menu*

What would you like to do?
    `.trim();

        await ctx.replyWithMarkdown(
            menuMessage,
            Markup.inlineKeyboard([
                [Markup.button.callback('🛒 Browse Categories', 'show_categories')],
                [Markup.button.callback('⭐ Featured Products', 'show_featured')],
                [Markup.button.callback('🛍️ My Cart', 'show_cart')],
                [Markup.button.callback('📦 My Orders', 'show_orders')],
            ])
        );
    }

    /**
     * Show categories
     */
    async showCategories(ctx) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const categories = await productService.getCategories();

        if (categories.length === 0) {
            return ctx.reply('No categories available at the moment.');
        }

        const keyboard = categories.map((cat) => [
            Markup.button.callback(
                `${cat.icon || '📦'} ${cat.name}`,
                `category_${cat._id}`
            ),
        ]);

        keyboard.push([Markup.button.callback('🏠 Back to Menu', 'back_to_menu')]);

        await ctx.replyWithMarkdown(
            '*📂 Categories*\n\nSelect a category to browse:',
            Markup.inlineKeyboard(keyboard)
        );
    }

    /**
     * Show featured products
     */
    async showFeaturedProducts(ctx) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const products = await productService.getFeaturedProducts(5);

        if (products.length === 0) {
            return ctx.reply('No featured products at the moment.');
        }

        for (const product of products) {
            await this.sendProductCard(ctx, product);
        }

        await ctx.reply(
            'Browse more products:',
            Markup.inlineKeyboard([
                [Markup.button.callback('🛒 Browse Categories', 'show_categories')],
                [Markup.button.callback('🛍️ View Cart', 'show_cart')],
            ])
        );
    }

    /**
     * Delete previous messages stored in session
     */
    async clearPreviousMessages(ctx) {
        try {
            const user = ctx.user;
            if (user.sessionData && user.sessionData.lastMessageIds && user.sessionData.lastMessageIds.length > 0) {
                for (const messageId of user.sessionData.lastMessageIds) {
                    try {
                        await ctx.deleteMessage(messageId).catch(() => { });
                    } catch (e) {
                        // Ignore
                    }
                }
                user.sessionData.lastMessageIds = [];
                user.markModified('sessionData');
                await user.save();
            }
        } catch (error) {
            logger.error('Error clearing previous messages:', error);
        }
    }

    /**
     * Show category products
     */
    async showCategoryProducts(ctx, categoryId, page = 1) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        // Clear previous pagination messages to keep chat clean and avoid duplicates
        await this.clearPreviousMessages(ctx);

        const category = await productService.getCategory(categoryId);
        const { products, total, pages } = await productService.getProductsByCategory(
            categoryId,
            page,
            5
        );

        if (products.length === 0) {
            return ctx.reply(`No products in ${category?.name || 'this category'}.`);
        }

        const user = ctx.user;
        if (!user.sessionData) user.sessionData = {};
        user.sessionData.lastMessageIds = [];

        const headerMsg = await ctx.replyWithMarkdown(`*${category.icon || '📦'} ${category.name}* — Page ${page}/${pages}`);
        user.sessionData.lastMessageIds.push(headerMsg.message_id);

        // Show products immediately with images and action buttons
        for (const product of products) {
            const msg = await this.sendProductCard(ctx, product);
            if (msg) user.sessionData.lastMessageIds.push(msg.message_id);
        }

        // Message for category info is already in the header

        // Pagination and Navigation
        const navButtons = [];
        if (page > 1) navButtons.push(Markup.button.callback('⬅️ Previous', `page_cat_${categoryId}_${page - 1}`));
        if (page < pages) navButtons.push(Markup.button.callback('➡️ Next', `page_cat_${categoryId}_${page + 1}`));

        const keyboard = [];
        if (navButtons.length) keyboard.push(navButtons);
        keyboard.push([Markup.button.callback('🛒 Categories', 'show_categories'), Markup.button.callback('🏠 Menu', 'back_to_menu')]);

        const footerMsg = await ctx.reply(
            `Showing ${products.length} of ${total} products:`,
            Markup.inlineKeyboard(keyboard)
        );
        user.sessionData.lastMessageIds.push(footerMsg.message_id);

        user.markModified('sessionData');
        await user.save();
    }

    /**
     * Send product card
     */
    async sendProductCard(ctx, product) {
        let imageUrl = product.getPrimaryImage();
        imageUrl = this.optimizeImageUrl(imageUrl, { width: 500 });
        const hasDiscount = product.discount > 0;

        const priceText = hasDiscount
            ? `<strike>₹${product.price}</strike> <b>₹${(product.finalPrice || 0).toFixed(0)}</b> (${product.discount}% OFF)`
            : `<b>₹${product.price}</b>`;

        const caption = `
<b>${product.name}</b>

💰 ${priceText}
${product.shortDescription || product.description.slice(0, 100) + '...'}

${product.availableStock > 0 ? '✅ In Stock' : '❌ Out of Stock'}
    `.trim();

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('🛒 Add to Cart', `add_to_cart_${product._id}`),
                Markup.button.callback('⚡ Buy Now', `buy_now_${product._id}`),
            ],
            [Markup.button.callback('📋 Details', `product_${product._id}`)],
        ]);

        if (imageUrl) {
            try {
                // Use { url: imageUrl } for more reliable sending
                return await ctx.replyWithPhoto({ url: imageUrl }, {
                    caption,
                    parse_mode: 'HTML',
                    ...keyboard,
                });
            } catch (photoError) {
                logger.warn(`Failed to send photo for product ${product.name}, falling back to text:`, photoError.message);
                return await ctx.replyWithHTML(caption, keyboard);
            }
        } else {
            return await ctx.replyWithHTML(caption, keyboard);
        }
    }

    /**
     * Show product details
     */
    async showProduct(ctx, productId) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const product = await productService.getProduct(productId);

        if (!product) {
            return ctx.reply('Product not found.');
        }

        let imageUrl = product.getPrimaryImage();
        imageUrl = this.optimizeImageUrl(imageUrl, { width: 800, quality: 'good' });
        const hasDiscount = product.discount > 0;
        const priceText = hasDiscount
            ? `<strike>₹${product.price}</strike> <b>₹${product.finalPrice.toFixed(0)}</b> (${product.discount}% OFF)`
            : `<b>₹${product.price}</b>`;

        const related = await productService.getRelatedProducts(productId, 3);
        let relatedText = '';
        if (related.length > 0) {
            relatedText = '\n\n✨ *Customers also viewed:*';
            related.forEach(p => {
                relatedText += `\n• ${p.name} - /view_${p._id}`;
            });
        }

        const message = `
<b>${product.name}</b>

📦 <b>Category:</b> ${product.category?.name || 'N/A'}
💰 <b>Price:</b> ${priceText}
⭐ <b>Rating:</b> ${(product.ratings?.average || 0).toFixed(1)}/5 (${product.ratings?.count || 0} reviews)
📊 <b>Stock:</b> ${product.availableStock > 0 ? `${product.availableStock} available` : 'Out of Stock'}

📝 <b>Description:</b>
${product.description}

${product.tags.length ? `🏷️ <b>Tags:</b> ${product.tags.join(', ')}` : ''}${relatedText}
    `.trim();

        const keyboard = product.availableStock > 0
            ? Markup.inlineKeyboard([
                [
                    Markup.button.callback('🛒 Add to Cart', `add_to_cart_${product._id}`),
                    Markup.button.callback('⚡ Buy Now', `buy_now_${product._id}`),
                ],
                [Markup.button.callback('🏠 Back to Menu', 'back_to_menu')],
            ])
            : Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Back to Menu', 'back_to_menu')],
            ]);

        if (imageUrl) {
            try {
                await ctx.replyWithPhoto({ url: imageUrl }, {
                    caption: message,
                    parse_mode: 'HTML',
                    ...keyboard,
                });
            } catch (err) {
                logger.warn(`Failed to send photo for details: ${err.message}`);
                await ctx.replyWithHTML(message, keyboard);
            }
        } else {
            await ctx.replyWithHTML(message, keyboard);
        }
    }

    /**
     * Add to cart
     */
    async addToCart(ctx, productId, size = null) {
        try {
            // Provide instant haptic feedback to remove the "please wait" feel
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

            const user = ctx.user;
            const product = await productService.getProduct(productId);

            if (!product || !product.isActive) {
                return ctx.reply('This product is not available.');
            }

            // If product has sizes and no size is selected yet
            if (product.sizes && product.sizes.length > 0 && !size) {
                return this.showSizeSelection(ctx, product, 'cart');
            }

            await cartService.addToCart(user._id, productId, 1, size);

            // Automatically show the cart items as requested
            await this.showCart(ctx);
        } catch (error) {
            logger.error('Error adding to cart:', error);
            ctx.reply(`❌ Sorry, I couldn't add that to your cart: ${error.message}`);
        }
    }

    /**
     * Show size selection
     */
    async showSizeSelection(ctx, product, flow = 'cart') {
        if (ctx.callbackQuery) await ctx.answerCbQuery('Select size').catch(() => { });

        const rows = [];
        for (let i = 0; i < product.sizes.length; i += 3) {
            rows.push(
                product.sizes.slice(i, i + 3).map(size =>
                    Markup.button.callback(size, `${flow === 'buy' ? 'buy_now_size' : 'select_size'}_${product._id}_${size}`)
                )
            );
        }
        rows.push([Markup.button.callback('❌ Cancel', `product_${product._id}`)]);

        const keyboard = Markup.inlineKeyboard(rows);
        await ctx.reply(`Please select a size for *${product.name}*:`, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    /**
     * Buy now (add and go to checkout)
     */
    async buyNow(ctx, productId, size = null) {
        try {
            const user = ctx.user;
            const product = await productService.getProduct(productId);

            if (!product || !product.isActive) {
                if (ctx.callbackQuery) await ctx.answerCbQuery('Product unavailable').catch(() => { });
                return ctx.reply('This product is not available.');
            }

            // If product has sizes and no size is selected yet
            if (product.sizes && product.sizes.length > 0 && !size) {
                return this.showSizeSelection(ctx, product, 'buy');
            }

            if (ctx.callbackQuery) await ctx.answerCbQuery('Processing...').catch(() => { });

            // Ask for quantity
            user.currentState = 'selecting_quantity';
            user.sessionData = {
                ...user.sessionData,
                pendingProductId: productId,
                pendingSize: size,
                buyNow: true,
            };
            await user.save();

            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback('1', `qty_${productId}_1`),
                    Markup.button.callback('2', `qty_${productId}_2`),
                    Markup.button.callback('3', `qty_${productId}_3`),
                ],
                [
                    Markup.button.callback('4', `qty_${productId}_4`),
                    Markup.button.callback('5', `qty_${productId}_5`),
                    Markup.button.callback('6', `qty_${productId}_6`),
                ],
                [Markup.button.callback('❌ Cancel', 'back_to_menu')],
            ]);

            await ctx.replyWithMarkdown(
                `*${product.name}*\n💰 ₹${product.finalPrice.toFixed(0)}\n\nSelect quantity:`,
                keyboard
            );
        } catch (error) {
            logger.error('Error in buy now:', error);
            ctx.reply(`❌ Sorry, I couldn't process your request: ${error.message}`);
        }
    }

    /**
     * Handle quantity selection
     */
    async handleQuantitySelection(ctx, productId, quantity) {
        try {
            // Instant feedback
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

            const user = ctx.user;
            const size = user.sessionData?.pendingSize || null;

            await cartService.addToCart(user._id, productId, quantity, size);

            if (user.sessionData?.buyNow) {
                // Clear the buyNow flag and proceed to checkout
                user.sessionData.buyNow = false;
                user.sessionData.pendingSize = null;
                user.markModified('sessionData');
                await user.save();
                return this.startCheckout(ctx);
            }

            // After selecting quantity, show the cart
            await this.showCart(ctx);
        } catch (error) {
            logger.error('Error handling quantity selection:', error);
            ctx.reply(`❌ Error: ${error.message}`);
        }
    }

    /**
     * Show cart
     */
    async showCart(ctx) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const user = ctx.user;
        const cartSummary = await cartService.getCartSummary(user._id);

        // Debug & Safeguard: Filter out any items where product might have failed to populate
        const validItems = cartSummary.items.filter(item => item && item.productId);

        if (cartSummary.isEmpty || validItems.length === 0) {
            // If there were orphan items, we should notify the user or just clear them
            if (!cartSummary.isEmpty && validItems.length === 0) {
                await cartService.clearCart(user._id);
            }

            const emptyMsg = '🛒 *Your cart is empty*\n\nStart shopping to add items!';
            const emptyKb = Markup.inlineKeyboard([
                [Markup.button.callback('🛒 Browse Categories', 'show_categories')],
            ]);

            if (ctx.callbackQuery) {
                return await ctx.editMessageText(emptyMsg, { parse_mode: 'Markdown', ...emptyKb }).catch(() => {
                    ctx.replyWithMarkdown(emptyMsg, emptyKb);
                });
            }
            return ctx.replyWithMarkdown(emptyMsg, emptyKb);
        }

        let cartText = '*🛍️ Your Cart*\n\n';

        for (const item of validItems) {
            const priceText = item.discount > 0
                ? `~₹${item.price}~ ₹${(item.finalPrice || 0).toFixed(0)}`
                : `₹${item.price}`;

            const sizeText = item.size ? ` [${item.size}]` : '';
            cartText += `*${item.name}${sizeText}*\n`;
            cartText += `${priceText} × ${item.quantity} = ₹${item.itemTotal.toFixed(0)}\n\n`;
        }

        cartText += '───────────────\n';
        if (cartSummary.discount > 0) {
            cartText += `Subtotal: ₹${cartSummary.subtotal.toFixed(0)}\n`;
            cartText += `Discount: -₹${cartSummary.discount.toFixed(0)}\n`;
        }
        cartText += `*Total: ₹${cartSummary.total.toFixed(0)}*`;

        const itemButtons = validItems.slice(0, 3).map((item) => [
            Markup.button.callback('➖', `cart_sub_${item.productId}`),
            Markup.button.callback(`${item.name.slice(0, 15)}...`, `product_${item.productId}`),
            Markup.button.callback('➕', `cart_add_${item.productId}`),
        ]);

        const actionButtons = [
            [Markup.button.callback('✅ Checkout', 'checkout')],
            [
                Markup.button.callback('🗑️ Clear Cart', 'clear_cart'),
                Markup.button.callback('🛒 Continue', 'show_categories'),
            ],
        ];

        const keyboard = Markup.inlineKeyboard([...itemButtons, ...actionButtons]);

        // Show all item images in a media group (limit to 3 as requested by user)
        const cartImages = validItems
            .filter(item => item.image)
            .slice(0, 3);

        const isActuallyCallback = !!ctx.callbackQuery;

        if (cartImages.length > 0) {
            try {
                // If we have images, we prefer a single photo with caption to avoid message flooding
                // and to allow easy EDITING which is faster.
                const primaryImageUrl = this.optimizeImageUrl(cartImages[0].image, { width: 800 });

                if (isActuallyCallback && ctx.callbackQuery.message.photo) {
                    // Update existing photo message
                    await ctx.editMessageMedia({
                        type: 'photo',
                        media: { url: primaryImageUrl },
                        caption: cartText,
                        parse_mode: 'Markdown'
                    }, keyboard);
                } else {
                    // If callback but no photo (e.g. from text menu), delete and send new
                    if (isActuallyCallback) await ctx.deleteMessage().catch(() => { });

                    await ctx.replyWithPhoto({ url: primaryImageUrl }, {
                        caption: cartText,
                        parse_mode: 'Markdown',
                        ...keyboard
                    });
                }
            } catch (err) {
                logger.warn('Failed to send/edit cart image, falling back to text:', err.message);
                // Fallback: try to edit text if possible, else reply
                if (isActuallyCallback) {
                    await ctx.editMessageText(cartText, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
                        await ctx.replyWithMarkdown(cartText, keyboard);
                    });
                } else {
                    await ctx.replyWithMarkdown(cartText, keyboard);
                }
            }
        } else {
            // No images in cart
            if (isActuallyCallback) {
                await ctx.editMessageText(cartText, { parse_mode: 'Markdown', ...keyboard }).catch(async () => {
                    await ctx.replyWithMarkdown(cartText, keyboard);
                });
            } else {
                await ctx.replyWithMarkdown(cartText, keyboard);
            }
        }

        user.currentState = 'viewing_cart';
        await user.save();
    }

    /**
     * Update cart quantity
     */
    async updateCartQuantity(ctx, productId, change) {
        try {
            const action = change > 0 ? 'Increasing' : 'Decreasing';
            if (ctx.callbackQuery) await ctx.answerCbQuery(`${action} quantity...`).catch(() => { });

            const user = ctx.user;
            const cart = await cartService.getCart(user._id);

            // Robustly find the item
            const item = cart.items.find((i) => {
                const itemProdId = i.product?._id || i.product;
                if (!itemProdId) return false;
                return itemProdId.toString() === productId.toString();
            });

            if (item) {
                const newQty = item.quantity + change;
                await cartService.updateQuantity(user._id, productId, newQty);
                // The model logic (updateItemQuantity) handles quantity <= 0 by removing the item
            } else if (change > 0) {
                // If item not found but we're trying to add it, maybe handle as add to cart
                await cartService.addToCart(user._id, productId, 1);
            }

            await this.showCart(ctx);
        } catch (error) {
            logger.error('Error updating cart:', error);
            if (ctx.callbackQuery) await ctx.answerCbQuery(`❌ ${error.message}`, { show_alert: true }).catch(() => { });
            else ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Remove from cart
     */
    async removeFromCart(ctx, productId) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

            const user = ctx.user;
            await cartService.removeFromCart(user._id, productId);
            await this.showCart(ctx);
        } catch (error) {
            logger.error('Error removing from cart:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Clear cart
     */
    async clearCart(ctx) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

            const user = ctx.user;
            await cartService.clearCart(user._id);

            await ctx.reply('🗑️ Cart cleared!');
            await this.showMainMenu(ctx);
        } catch (error) {
            logger.error('Error clearing cart:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Start checkout process
     */
    async startCheckout(ctx) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

            let user = ctx.user;

            // Safety check for user profile
            if (!user && ctx.from) {
                logger.info(`CHECKOUT RECOVERY: Explicit call for ${ctx.from.id}`);
                user = await User.findOrCreateByTelegramId(ctx.from);
                ctx.user = user;
            }

            if (!user) {
                throw new Error('User profile could not be loaded. Please type /start to refresh.');
            }

            const cartSummary = await cartService.getCartSummary(user._id);

            if (cartSummary.isEmpty || cartSummary.items.length === 0) {
                return ctx.reply('🛒 Your cart is empty! Please add some items before checking out.');
            }

            // Validate cart for stock and availability
            const { isValid, issues } = await cartService.validateCart(user._id);

            if (!isValid) {
                let issueText = '⚠️ Your cart has some issues that need to be fixed:\n\n';
                issues.forEach((issue) => {
                    issueText += `• ${issue.issue}\n`;
                });
                return ctx.reply(issueText, Markup.inlineKeyboard([
                    [Markup.button.callback('🛍️ View Cart to Fix', 'show_cart')]
                ]));
            }

            // Prepare for address entry/selection
            user.currentState = 'entering_address';
            await user.save();

            // Check for saved addresses
            if (user.addresses && user.addresses.length > 0) {
                const defaultAddr = user.getDefaultAddress();

                // Use HTML to avoid Markdown parsing errors if address has special chars
                const addressMsg = `📍 <b>Delivery Address</b>\n\nUse your saved address?\n\n<b>${defaultAddr.label}</b>: ${defaultAddr.address}`;

                await ctx.reply(addressMsg, {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('✅ Use This Address', 'use_saved_address')],
                        [Markup.button.callback('📝 Enter New Address', 'enter_new_address')],
                        [Markup.button.callback('🏠 Back to Menu', 'back_to_menu')],
                    ])
                });
            } else {
                await this.promptNewAddress(ctx);
            }
        } catch (error) {
            logger.error(`Error in startCheckout for user ${ctx.from?.id}:`, error);
            ctx.reply(`❌ ${error.message.includes('profile') ? error.message : 'Sorry, I encountered an error while starting the checkout. Please try again or contact support if this persists.'}`);
        }
    }

    /**
     * Prompt for new address
     */
    async promptNewAddress(ctx) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const user = ctx.user;
        user.currentState = 'entering_address';
        await user.save();

        await ctx.replyWithMarkdown(
            '📍 *Enter Delivery Address*\n\nPlease share your location or type your complete address:',
            Markup.keyboard([
                [Markup.button.locationRequest('📍 Share Location')],
                [Markup.button.text('❌ Cancel')],
            ]).resize()
        );
    }

    /**
     * Use saved address
     */
    async useSavedAddress(ctx) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

            const user = ctx.user;
            const address = user.getDefaultAddress();

            if (!address) {
                return ctx.reply('⚠️ No saved address found. Please enter a new address.');
            }

            user.sessionData = {
                ...user.sessionData,
                deliveryAddress: {
                    address: address.address,
                    // Safe check for location coordinates
                    coordinates: address.location?.coordinates || [77.5946, 12.9716],
                },
            };
            user.currentState = 'selecting_payment';
            user.markModified('sessionData');
            await user.save();

            await this.showPaymentMethods(ctx);
        } catch (error) {
            logger.error('Error in useSavedAddress:', error);
            ctx.reply('❌ Sorry, I had trouble loading your saved address. Please try entering a new one.');
        }
    }

    /**
     * Handle location
     */
    async handleLocation(ctx) {
        const user = ctx.user;

        if (user.currentState !== 'entering_address') {
            return;
        }

        const { latitude, longitude } = ctx.message.location;

        // Perform reverse geocoding to get a real address
        const formattedAddress = await mapsService.reverseGeocode(latitude, longitude);

        // Store location
        user.sessionData = {
            ...user.sessionData,
            deliveryAddress: {
                address: formattedAddress,
                coordinates: [longitude, latitude],
            },
        };
        user.currentState = 'selecting_payment';

        // Save to user addresses
        const existingAddress = user.addresses.find((a) =>
            Math.abs(a.location.coordinates[0] - longitude) < 0.0001 &&
            Math.abs(a.location.coordinates[1] - latitude) < 0.0001
        );

        if (!existingAddress) {
            user.addresses.push({
                label: 'Shared Location',
                address: formattedAddress,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                isDefault: user.addresses.length === 0,
            });
        }

        await user.save();

        // Remove keyboard
        await ctx.reply('📍 Location received!', Markup.removeKeyboard());

        await this.showPaymentMethods(ctx);
    }

    /**
     * Handle text input
     */
    async handleText(ctx) {
        const user = ctx.user;
        let text = ctx.message.text;

        // Clean text: Remove bot username if it starts with it (e.g. from suggestions or mentions)
        if (this.botInfo?.username) {
            const username = `@${this.botInfo.username}`;
            if (text.toLowerCase().startsWith(username.toLowerCase())) {
                text = text.substring(username.length).trim();
            }
        }

        // Return if text is now empty
        if (!text) return;

        // Check if it's a deep link from media group (e.g. /view_658...)
        if (text.startsWith('/view_')) {
            const productId = text.replace('/view_', '');
            return this.showProduct(ctx, productId);
        }

        // Cancel
        if (text === '❌ Cancel') {
            user.currentState = 'idle';
            user.sessionData = {};
            await user.save();
            await ctx.reply('Cancelled.', Markup.removeKeyboard());
            return this.showMainMenu(ctx);
        }

        // Handle based on state
        switch (user.currentState) {
            case 'entering_address':
                await this.handleAddressInput(ctx, text);
                break;

            default:
                // Check if it's a greeting or just process with AI
                const greetings = ['hi', 'hello', 'hey', 'start'];
                if (greetings.includes(text.toLowerCase())) {
                    await this.handleStart(ctx);
                } else {
                    await this.handleAIRequest(ctx, text);
                }
                break;
        }
    }

    /**
     * Handle address input
     */
    async handleAddressInput(ctx, address) {
        try {
            const user = ctx.user;

            // Simple geocoding fallback (in production, use Google Maps API)
            user.sessionData = {
                ...user.sessionData,
                deliveryAddress: {
                    address: address,
                    coordinates: [77.5946, 12.9716], // Default to Bangalore
                },
            };

            // Save to user addresses
            user.addresses.push({
                label: 'Delivery Address',
                address: address,
                location: {
                    type: 'Point',
                    coordinates: [77.5946, 12.9716],
                },
                isDefault: user.addresses.length === 0,
            });

            user.currentState = 'selecting_payment';
            user.markModified('sessionData');
            await user.save();

            await ctx.reply('📍 Address saved!', Markup.removeKeyboard());
            await this.showPaymentMethods(ctx);
        } catch (error) {
            logger.error('Error in handleAddressInput:', error);
            ctx.reply('❌ Sorry, I had trouble saving your address. Please try again.');
        }
    }

    /**
     * Handle contact
     */
    async handleContact(ctx) {
        const user = ctx.user;
        user.phone = ctx.message.contact.phone_number;
        await user.save();
        await ctx.reply('📱 Phone number saved!');
    }

    /**
     * Show payment methods
     */
    async showPaymentMethods(ctx) {
        try {
            const user = ctx.user;
            const cartSummary = await cartService.getCartSummary(user._id);
            const grandTotal = cartSummary.total + 40;
            const RAZORPAY_LIMIT = 50000;

            let message = `
💳 *Select Payment Method*

📦 Items: ${cartSummary.itemCount}
💰 Total: ₹${cartSummary.total.toFixed(2)}
🚚 Delivery: ₹40

*Grand Total: ₹${grandTotal.toFixed(2)}*
`.trim();

            const buttons = [];

            if (grandTotal > RAZORPAY_LIMIT) {
                message += `\n\n⚠️ *High Value Order:* Online payment is limited to ₹${RAZORPAY_LIMIT} in test mode. Please use Cash on Delivery or reduce your cart amount.`;
                buttons.push([Markup.button.callback('💵 Cash on Delivery', 'pay_cod')]);
            } else {
                message += `\n\nHow would you like to pay?`;
                buttons.push([Markup.button.callback('💳 Pay Online (Razorpay)', 'pay_razorpay')]);
                buttons.push([Markup.button.callback('💵 Cash on Delivery', 'pay_cod')]);
            }

            buttons.push([Markup.button.callback('❌ Cancel', 'back_to_menu')]);

            // If it was triggered by a callback, we edit the message for speed
            if (ctx.callbackQuery) {
                await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard(buttons)
                }).catch(async () => {
                    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
                });
            } else {
                await ctx.replyWithMarkdown(
                    message,
                    Markup.inlineKeyboard(buttons)
                );
            }
        } catch (error) {
            logger.error('Error in showPaymentMethods:', error);
            ctx.reply('❌ Error loading payment options. Please try again from the cart.');
        }
    }

    /**
     * Select payment method and create order
     */
    async selectPaymentMethod(ctx, method) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Processing order...').catch(() => { });

            const user = ctx.user;
            const deliveryAddress = user.sessionData.deliveryAddress;

            if (!deliveryAddress) {
                return ctx.reply('Please provide delivery address first.');
            }

            // Create order
            const order = await orderService.createOrder(
                user._id,
                deliveryAddress,
                method
            );

            user.currentState = method === 'razorpay' ? 'awaiting_payment' : 'tracking_order';
            user.sessionData = { currentOrderId: order._id };
            await user.save();

            if (method === 'razorpay') {
                await ctx.replyWithMarkdown(
                    `
🛍️ *Order Created!*

📦 Order ID: \`${order.orderId}\`
💰 Amount: ₹${order.total.toFixed(2)}

⏱️ *Please complete payment within 15 minutes*

Click below to pay:
          `.trim(),
                    Markup.inlineKeyboard([
                        [Markup.button.url('💳 Pay Now', order.paymentLink)],
                        [Markup.button.callback('❌ Cancel Order', `cancel_order_${order._id}`)],
                    ])
                );
            } else {
                await ctx.replyWithMarkdown(
                    `
✅ *Order Confirmed!*

📦 Order ID: \`${order.orderId}\`
💰 Total: ₹${order.total.toFixed(2)} (COD)

Your order is being prepared!
We'll notify you when a delivery partner is assigned.
          `.trim(),
                    Markup.inlineKeyboard([
                        [Markup.button.callback('📦 Track Order', `order_${order._id}`)],
                        [Markup.button.callback('🏠 Back to Menu', 'back_to_menu')],
                    ])
                );

                // Confirm order (for COD)
                await orderService.confirmOrder(order._id);
            }
        } catch (error) {
            logger.error('Error in selectPaymentMethod:', error);
            let errorMessage = error.message || (error.error && error.error.description) || 'An unknown error occurred';

            // Special handling for Razorpay amount limits
            if (errorMessage.includes('amount exceeds maximum')) {
                errorMessage = 'The order amount is too high for online payment (Test Mode limit: ₹50,000). Please use Cash on Delivery or reduce your cart items.';
            }

            ctx.reply(`❌ ${errorMessage}`);
        }
    }

    /**
     * Show orders
     */
    async showOrders(ctx) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const user = ctx.user;
        const { orders, total } = await orderService.getUserOrders(user._id, 1, 5);

        if (total === 0) {
            return ctx.replyWithMarkdown(
                "📦 *No orders yet*\n\nStart shopping to create your first order!",
                Markup.inlineKeyboard([
                    [Markup.button.callback('🛒 Shop Now', 'show_categories')],
                ])
            );
        }

        let orderText = '*📦 Your Orders*\n\n';

        for (const order of orders) {
            const statusEmoji = this.getStatusEmoji(order.status);
            orderText += `*${order.orderId}*\n`;
            orderText += `${statusEmoji} ${order.status.toUpperCase()}\n`;
            orderText += `💰 ₹${order.total.toFixed(2)} | ${order.items.length} items\n`;
            orderText += `📅 ${new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n`;
        }

        const orderButtons = orders.slice(0, 3).map((order) => [
            Markup.button.callback(
                `📦 ${order.orderId}`,
                `order_${order._id}`
            ),
        ]);

        orderButtons.push([Markup.button.callback('🏠 Back to Menu', 'back_to_menu')]);

        await ctx.replyWithMarkdown(orderText, Markup.inlineKeyboard(orderButtons));
    }

    /**
     * Show order details
     */
    async showOrderDetails(ctx, orderId) {
        if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });

        const order = await orderService.getOrder(orderId);

        if (!order) {
            return ctx.reply('Order not found.');
        }

        const { text, progress } = this.getTrackingProgress(order);

        const statusEmoji = this.getStatusEmoji(order.status);

        let orderText = `
📦 *Order: ${order.orderId}*

${progress}
${text}

💳 Payment: ${order.paymentStatus}
📅 Created: ${new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

*Items:*
    `.trim();

        for (const item of order.items) {
            orderText += `\n• ${item.productName} × ${item.quantity} = ₹${item.total.toFixed(2)}`;
        }

        orderText += `\n\n───────────────`;
        orderText += `\nSubtotal: ₹${order.subtotal.toFixed(2)}`;
        if (order.discount > 0) {
            orderText += `\nDiscount: -₹${order.discount.toFixed(2)}`;
        }
        orderText += `\nDelivery: ₹${order.deliveryFee}`;
        orderText += `\n*Total: ₹${order.total.toFixed(2)}*`;

        orderText += `\n\n📍 *Delivery Address:*\n${order.deliveryAddress.address}`;

        if (order.deliveryPartner) {
            orderText += `\n\n🚴 *Delivery Partner:*\n${order.deliveryPartner.name} | ${order.deliveryPartner.phone}`;
        }

        if (order.estimatedDeliveryTime) {
            orderText += `\n\n⏱️ *ETA:* ${new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`;
        }

        const buttons = [];

        if (['pending'].includes(order.status) && order.paymentMethod === 'razorpay') {
            buttons.push([
                Markup.button.url('💳 Pay Now', order.paymentLink),
                Markup.button.callback('🔄 Retry Link', `retry_payment_${order._id}`),
            ]);
        }

        if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
            buttons.push([
                Markup.button.callback('❌ Cancel Order', `cancel_order_${order._id}`),
            ]);
        }

        buttons.push([
            Markup.button.callback('🔄 Refresh Status', `order_${order._id}`),
            Markup.button.callback('📦 All Orders', 'show_orders')
        ]);
        buttons.push([Markup.button.callback('🏠 Menu', 'back_to_menu')]);

        await ctx.replyWithMarkdown(orderText, Markup.inlineKeyboard(buttons));
    }

    /**
     * Retry payment action
     */
    async retryPaymentAction(ctx, orderId) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Generating new link...').catch(() => { });

            const updatedOrder = await orderService.retryPayment(orderId);

            await ctx.replyWithMarkdown(
                `✅ *New Payment Link Generated!*\n\n💰 Amount: ₹${updatedOrder.total.toFixed(2)}\n⏱️ Expiry: ${new Date(updatedOrder.expiresAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}\n\nClick below to pay:`,
                Markup.inlineKeyboard([
                    [Markup.button.url('💳 Pay Now', updatedOrder.paymentLink)],
                    [Markup.button.callback('📦 View Order', `order_${updatedOrder._id}`)]
                ])
            );
        } catch (error) {
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Show active order
     */
    async showActiveOrder(ctx) {
        const user = ctx.user;

        const { orders } = await orderService.getUserOrders(user._id, 1, 1);
        const activeOrder = orders.find((o) =>
            ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(
                o.status
            )
        );

        if (!activeOrder) {
            return ctx.reply('No active orders to track.');
        }

        await this.showOrderDetails(ctx, activeOrder._id);
    }

    /**
     * Cancel order
     */
    async cancelOrder(ctx, orderId) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Cancelling order...').catch(() => { });

            await orderService.cancelOrder(orderId, 'User requested');

            await ctx.reply('❌ Order cancelled successfully.');
            await this.showMainMenu(ctx);
        } catch (error) {
            logger.error('Error cancelling order:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Get tracking progress bar and text (Zepto Style - 10 Min Delivery)
     */
    getTrackingProgress(order) {
        const statuses = [
            { id: 'confirmed', label: 'Received', icon: '🛒' },
            { id: 'preparing', label: 'Packing', icon: '📦' },
            { id: 'out_for_delivery', label: 'Delivering', icon: '🚀' },
            { id: 'delivered', label: 'Delivered', icon: '🏠' }
        ];

        const findTime = (status) => {
            const entry = order.statusHistory.find(h => h.status === status);
            return entry ? new Date(entry.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : null;
        };

        if (order.status === 'pending') {
            const expiry = order.expiresAt ? `\n⏳ *Expires at:* ${new Date(order.expiresAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}` : '';
            return { text: `⏳ *Awaiting Payment Confirmation*${expiry}`, progress: '🕒' };
        }
        if (order.status === 'cancelled') return { text: `❌ *Status: CANCELLED*\n📅 ${findTime('cancelled') || ''}`, progress: '🛑' };
        if (order.status === 'refunded') return { text: `💰 *Status: REFUNDED*\n📅 ${findTime('refunded') || ''}`, progress: '🛑' };

        let currentIndex = statuses.findIndex(s => s.id === order.status);
        if (order.status === 'ready_for_pickup') currentIndex = 1;

        let progress = '';
        statuses.forEach((s, index) => {
            if (index < currentIndex) progress += '🟩';
            else if (index === currentIndex) progress += '⚡';
            else progress += '⬜';
        });

        const currentStatus = statuses[currentIndex] || statuses[0];

        let subText = '';
        switch (order.status) {
            case 'confirmed': subText = `_Received at ${findTime('confirmed') || 'just now'} - Store is starting to pick items!_`; break;
            case 'preparing': subText = `_Packing started at ${findTime('preparing') || ''} - Store partner is packing with care._`; break;
            case 'ready_for_pickup': subText = `_Ready for pickup since ${findTime('ready_for_pickup') || ''}_`; break;
            case 'out_for_delivery': subText = `_🚀 *Speedy Delivery:* Left store at ${findTime('out_for_delivery') || ''}_`; break;
            case 'delivered': subText = `_✅ *Delivered at ${findTime('delivered') || ''}*_`; break;
            default: subText = '';
        }

        return {
            text: `${currentStatus.icon} *${currentStatus.label.toUpperCase()}*\n${subText}`,
            progress: `⚡ ${progress} ⚡`
        };
    }

    getStatusEmoji(status) {
        const emojis = {
            pending: '⏳',
            confirmed: '🛒',
            preparing: '📦',
            ready_for_pickup: '🛍️',
            out_for_delivery: '⚡🚀',
            delivered: '🏠',
            cancelled: '❌',
            refunded: '💰',
        };
        return emojis[status] || '📦';
    }

    /**
     * Send notification to user
     */
    async sendNotification(telegramId, message, keyboard = null) {
        try {
            const options = {
                parse_mode: 'Markdown',
                ...(keyboard && keyboard),
            };

            await this.bot.telegram.sendMessage(telegramId, message, options);
        } catch (error) {
            logger.error('Error sending notification:', error);
        }
    }

    /**
     * Notify order status update
     */
    async notifyOrderUpdate(order, user) {
        const statusEmoji = this.getStatusEmoji(order.status);
        const { text } = this.getTrackingProgress(order);

        const message = `
${statusEmoji} *Zepto Speed Update*

Order: \`${order.orderId}\`
${text}
${order.estimatedDeliveryTime ? `⏱️ *Arriving by:* ${new Date(order.estimatedDeliveryTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}` : '⏱️ *Arrival:* Under 10 mins'}
    `.trim();

        await this.sendNotification(
            user.telegramId,
            message,
            Markup.inlineKeyboard([
                [Markup.button.callback('⚡ Track in Real-time', `order_${order._id}`)],
            ])
        );
    }

    /**
     * Notify payment success
     */
    async notifyPaymentSuccess(order, user) {
        let itemsTotal = order.items.map(item => `• ${item.productName} × ${item.quantity}`).join('\n');

        const paymentLabel = order.paymentMethod === 'razorpay' ? 'Online' : 'COD';
        const message = `
✅ *Order Received!*

🛍️ *Order ID: ${order.orderId}*
────────────────────
${itemsTotal}

💰 *Total: ₹${order.total.toFixed(2)}* (${paymentLabel})
📍 *Delivery to:* ${order.deliveryAddress.address}

🚀 *Zepto Promise:*
Your items are being packed. Expect delivery in *10 minutes*!
    `.trim();

        await this.sendNotification(
            user.telegramId,
            message,
            Markup.inlineKeyboard([
                [Markup.button.callback('📦 Track My Order', `order_${order._id}`)],
                [Markup.button.callback('🏠 Main Menu', 'back_to_menu')],
            ])
        );
    }

    /**
     * Admin Notifications
     */
    async notifyAdminNewOrder(order, user) {
        if (!config.admin.adminChatId) return;

        const itemsTotal = order.items.map(item => `• ${item.productName} × ${item.quantity}`).join('\n');
        const message = `
🔔 *NEW ORDER RECEIVED* (Zepto Style)
────────────────────
🆔 ID: \`${order.orderId}\`
👤 User: ${user.getFullName()} (@${user.username || 'n/a'})
💰 Total: ₹${order.total.toFixed(2)} (${order.paymentMethod.toUpperCase()})
📍 Address: ${order.deliveryAddress.address}

🛒 *Items:*
${itemsTotal}

⏱️ Status: ${order.status.toUpperCase()}
    `.trim();

        await this.sendNotification(config.admin.adminChatId, message);
    }

    async notifyAdminStatusUpdate(order, user) {
        if (!config.admin.adminChatId) return;

        const message = `
📢 *ORDER STATUS UPDATE*
────────────────────
🆔 ID: \`${order.orderId}\`
👤 User: ${user.getFullName()}
🔄 New Status: *${order.status.toUpperCase()}*
📍 Address: ${order.deliveryAddress.address}
    `.trim();

        await this.sendNotification(config.admin.adminChatId, message);
    }

    /**
     * Notify auto-cancellation
     */
    async notifyAutoCancellation(order, user) {
        const message = `
⏰ *Order Auto-Cancelled*

Order: \`${order.orderId}\`

Your order was automatically cancelled because payment was not received within 15 minutes.

Items have been returned to your cart. You can try again!
    `.trim();

        await this.sendNotification(
            user.telegramId,
            message,
            Markup.inlineKeyboard([
                [Markup.button.callback('🛒 Shop Again', 'show_categories')],
            ])
        );
    }

    /**
     * Notify delivery assignment
     */
    async notifyDeliveryAssignment(order, user, partner) {
        const message = `
🚴 *Delivery Partner Assigned*

Order: \`${order.orderId}\`

👤 *${partner.name}*
📱 ${partner.phone}
⭐ Rating: ${partner.stats.averageRating.toFixed(1)}/5

${order.estimatedDeliveryTime ? `⏱️ ETA: ${new Date(order.estimatedDeliveryTime).toLocaleTimeString()}` : ''}
    `.trim();

        await this.sendNotification(
            user.telegramId,
            message,
            Markup.inlineKeyboard([
                [Markup.button.callback('📦 Track Order', `order_${order._id}`)],
            ])
        );
    }

    /**
     * Handle voice messages
     */
    async handleVoice(ctx) {
        const user = ctx.user;
        const fileId = ctx.message.voice.file_id;

        try {
            await ctx.reply('🎤 Transcription starting...');

            // Get file link
            const fileLink = await ctx.telegram.getFileLink(fileId);
            const tempDir = path.join(__dirname, '../../temp');
            const audioPath = path.join(tempDir, `voice_${fileId}.ogg`);

            // Ensure temp dir exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Download file
            const response = await axios({
                method: 'GET',
                url: fileLink.href,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(audioPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Transcribe
            const transcription = await aiService.transcribeAudio(audioPath);

            // Clean up
            if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
            }

            if (!transcription || transcription.trim().length === 0) {
                return ctx.reply('❌ Sorry, I couldn\'t hear anything in that voice message.');
            }

            await ctx.reply(`📝 *You said:* ${transcription}`, { parse_mode: 'Markdown' });

            // Process as AI request
            await this.handleAIRequest(ctx, transcription);

        } catch (error) {
            logger.error('Voice handling error:', error);
            ctx.reply('❌ Sorry, I couldn\'t process your voice message. Please try typing.');
        }
    }

    /**
     * Handle AI request processing
     */
    async handleAIRequest(ctx, message) {
        const user = ctx.user;

        try {
            // Show typing status
            await ctx.sendChatAction('typing');

            // Get context for AI
            const categories = await productService.getCategories();
            const cartSummary = await cartService.getCartSummary(user._id);
            const activeOrders = await Order.find({
                user: user._id,
                status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] }
            });

            const context = {
                cartCount: cartSummary.itemCount,
                activeOrdersCount: activeOrders.length,
                categories: categories.map(c => c.name)
            };

            const aiResult = await aiService.processMessage(user, message, context);

            // If a product is mentioned, try to respond with its photo for a better visual experience
            let repliedWithPhoto = false;
            if (aiResult.data?.product && aiResult.intent !== 'search') {
                const products = await productService.searchProducts(aiResult.data.product, 1);
                if (products.length > 0) {
                    const product = products[0];
                    const imageUrl = this.optimizeImageUrl(product.getPrimaryImage(), { width: 500, quality: 'eco' });
                    if (imageUrl) {
                        try {
                            await ctx.replyWithPhoto({ url: imageUrl }, {
                                caption: aiResult.response,
                                parse_mode: 'Markdown'
                            });
                            repliedWithPhoto = true;
                        } catch (e) {
                            logger.warn('Failed to reply with photo in AI request:', e.message);
                        }
                    }
                }
            }

            // Fallback to text reply if no photo was sent
            if (!repliedWithPhoto) {
                await ctx.reply(aiResult.response);
            }

            // Handle intent
            switch (aiResult.intent) {
                case 'browse':
                case 'categories':
                    await this.showCategories(ctx);
                    break;
                case 'search':
                    if (aiResult.data?.product) {
                        const products = await productService.searchProducts(aiResult.data.product);
                        if (products.length > 0) {
                            for (const product of products.slice(0, 3)) {
                                await this.sendProductCard(ctx, product);
                            }
                        } else {
                            await ctx.reply(`I couldn't find any products matching "${aiResult.data.product}". Here are some featured items you might like instead:`);
                            const featured = await productService.getFeaturedProducts(3);
                            for (const product of featured) {
                                await this.sendProductCard(ctx, product);
                            }
                        }
                    }
                    break;
                case 'add_to_cart':
                    if (aiResult.data?.product) {
                        const products = await productService.searchProducts(aiResult.data.product);
                        if (products.length > 0) {
                            await this.addToCart(ctx, products[0]._id);
                        } else {
                            await ctx.reply(`I couldn't find "${aiResult.data.product}" to add to your cart.`);
                        }
                    }
                    break;
                case 'view_cart':
                    await this.showCart(ctx);
                    break;
                case 'checkout':
                    await this.startCheckout(ctx);
                    break;
                case 'track_order':
                case 'orders':
                    await this.showOrders(ctx);
                    break;
                case 'help':
                    await this.handleHelp(ctx);
                    break;
                case 'cancel_order':
                    await ctx.reply('To cancel an order, please go to "My Orders" and select the order you wish to cancel.');
                    await this.showOrders(ctx);
                    break;
                default:
                    // If a product was mentioned in general chat, show its card
                    if (aiResult.data?.product) {
                        const products = await productService.searchProducts(aiResult.data.product, 1);
                        if (products.length > 0) {
                            await this.sendProductCard(ctx, products[0]);
                        }
                    }
                    break;
            }

        } catch (error) {
            logger.error('AI Request error:', error);
            ctx.reply('I processed your request, but something went wrong in execution. How else can I help?');
        }
    }

    /**
     * Handle inline queries (Search from anywhere)
     */
    async handleInlineQuery(ctx) {
        try {
            const query = ctx.inlineQuery.query;
            let products = [];

            if (query && query.trim().length > 0) {
                // Search for products
                products = await productService.searchProducts(query, 20);

                // If results are thin, add some featured products as suggestions
                if (products.length < 5) {
                    const featured = await productService.getFeaturedProducts(10);
                    const existingIds = new Set(products.map(p => p._id.toString()));
                    for (const f of featured) {
                        if (!existingIds.has(f._id.toString()) && products.length < 20) {
                            products.push(f);
                        }
                    }
                }
            } else {
                // Show featured products if no query
                products = await productService.getFeaturedProducts(20);
            }

            const results = products.map((product) => {
                let imageUrl = product.getPrimaryImage();
                imageUrl = this.optimizeImageUrl(imageUrl, { width: 400 });

                const priceText = product.discount > 0
                    ? `₹${product.finalPrice.toFixed(0)} (Save ${product.discount}%)`
                    : `₹${product.price}`;

                return {
                    type: 'photo',
                    id: product._id.toString(),
                    photo_url: imageUrl,
                    thumb_url: imageUrl,
                    title: product.name,
                    caption: `
<b>${product.name}</b>

💰 <b>Price:</b> ${product.discount > 0 ? `<strike>₹${product.price}</strike> ` : ''}<b>₹${product.finalPrice.toFixed(0)}</b>
⭐ <b>Rating:</b> ${product.ratings.average.toFixed(1)}/5
📝 ${product.shortDescription || product.description.slice(0, 50)}

${product.availableStock > 0 ? '✅ <i>In Stock</i>' : '❌ <i>Out of Stock</i>'}
                    `.trim(),
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard([
                        [Markup.button.callback('📦 View More', `product_${product._id}`)],
                        [Markup.button.callback('🛒 Add to Cart', `add_to_cart_${product._id}`)],
                    ]).reply_markup,
                };
            });

            // If no results, show a "start shopping" button or empty result
            if (results.length === 0) {
                return await ctx.answerInlineQuery([], {
                    switch_pm_text: 'No products found. Tap to browse catalog.',
                    switch_pm_parameter: 'start',
                });
            }

            await ctx.answerInlineQuery(results, {
                cache_time: 300, // 5 minutes
            });

        } catch (error) {
            logger.error('Inline Query Error:', error);
            await ctx.answerInlineQuery([], {
                switch_pm_text: 'Something went wrong. Try again.',
                switch_pm_parameter: 'help',
            });
        }
    }

    /**
     * Start bot (webhook)
     */
    async startWebhook(app, path = '/webhook/telegram') {
        if (!config.telegram.webhookUrl) {
            throw new Error('TELEGRAM_WEBHOOK_URL not configured');
        }

        // Set webhook
        await this.bot.telegram.setWebhook(`${config.telegram.webhookUrl}${path}`);

        // Use webhook middleware
        app.use(path, this.bot.webhookCallback(path));

        logger.info(`Telegram bot webhook set: ${config.telegram.webhookUrl}${path}`);
    }

    /**
     * Start bot (polling) - for development
     */
    async startPolling() {
        // Delete webhook first
        await this.bot.telegram.deleteWebhook();

        // Start polling
        this.bot.launch();

        logger.info('Telegram bot started in polling mode');

        // Graceful shutdown
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = new BotService();
