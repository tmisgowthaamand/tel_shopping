const { Markup } = require('telegraf');
const { DeliveryPartner, Order, User } = require('../models');
const { deliveryService, orderService } = require('../services');
const logger = require('../utils/logger');

class DeliveryBotHandler {
    constructor(bot) {
        this.bot = bot;
    }

    /**
     * Initialize delivery partner handlers
     */
    initialize() {
        // Partner-specific commands (would be a separate bot in production)
        // For now, using prefixed commands
        this.registerCommands();
        this.registerActions();

        logger.info('Delivery bot handlers initialized');
    }

    /**
     * Register partner commands
     */
    registerCommands() {
        // Register as partner
        this.bot.command('partner_register', async (ctx) => {
            await this.handleRegistration(ctx);
        });

        // Go online
        this.bot.command('go_online', async (ctx) => {
            await this.promptGoOnline(ctx);
        });

        // Go offline
        this.bot.command('go_offline', async (ctx) => {
            await this.handleGoOffline(ctx);
        });

        // View current order
        this.bot.command('my_delivery', async (ctx) => {
            await this.showCurrentDelivery(ctx);
        });

        // View earnings
        this.bot.command('earnings', async (ctx) => {
            await this.showEarnings(ctx);
        });

        // Partner status
        this.bot.command('partner_status', async (ctx) => {
            await this.showPartnerStatus(ctx);
        });
    }

    /**
     * Register partner actions
     */
    registerActions() {
        // Accept delivery
        this.bot.action(/^accept_delivery_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            await this.acceptDelivery(ctx, orderId);
        });

        // Reject delivery
        this.bot.action(/^reject_delivery_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            await this.rejectDelivery(ctx, orderId);
        });

        // Update delivery status
        this.bot.action(/^delivery_status_(.+)_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            const status = ctx.match[2];
            await this.updateDeliveryStatus(ctx, orderId, status);
        });

        // Navigate to customer
        this.bot.action(/^navigate_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            await this.showNavigation(ctx, orderId);
        });

        // COD Paid and Delivered
        this.bot.action(/^delivery_paid_delivered_(.+)$/, async (ctx) => {
            const orderId = ctx.match[1];
            await this.handleCODPaymentAndDelivery(ctx, orderId);
        });
    }

    /**
     * Handle partner registration
     */
    async handleRegistration(ctx) {
        const telegramId = ctx.from.id.toString();

        // Check if already registered
        const existingPartner = await DeliveryPartner.findOne({ telegramId });

        if (existingPartner) {
            return ctx.reply('You are already registered as a delivery partner!');
        }

        // Create new partner
        const partner = await DeliveryPartner.create({
            telegramId,
            name: ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : ''),
            phone: 'Update required',
            isActive: false, // Needs admin approval
        });

        await ctx.replyWithMarkdown(
            `
🚴 *Partner Registration Submitted*

Your registration is pending approval.
An admin will verify your details and activate your account.

Please update your profile:
• Phone number
• Vehicle details
• Document verification

You'll be notified once approved!
      `.trim()
        );

        logger.info(`New delivery partner registered: ${partner.name}`);
    }

    /**
     * Prompt go online with location
     */
    async promptGoOnline(ctx) {
        const partner = await this.getPartner(ctx);
        if (!partner) return;

        if (!partner.isActive) {
            return ctx.reply('Your account is pending activation. Please wait for admin approval.');
        }

        await ctx.reply(
            '📍 Share your current location to go online:',
            Markup.keyboard([
                [Markup.button.locationRequest('📍 Share Location & Go Online')],
                [Markup.button.text('❌ Cancel')],
            ]).resize()
        );

        // Set up one-time location handler
        this.bot.on('location', async (locationCtx) => {
            if (locationCtx.from.id.toString() === partner.telegramId) {
                await this.handleGoOnline(locationCtx, partner);
            }
        });
    }

    /**
     * Handle go online
     */
    async handleGoOnline(ctx, partner = null) {
        if (!partner) {
            partner = await this.getPartner(ctx);
            if (!partner) return;
        }

        const { latitude, longitude } = ctx.message.location;

        await partner.goOnline(longitude, latitude);

        await ctx.reply(
            `
✅ *You are now ONLINE*

📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}

You will receive delivery requests for orders in your area.
Share your location again to update your position.

Use /go_offline to stop receiving requests.
      `.trim(),
            {
                parse_mode: 'Markdown',
                ...Markup.removeKeyboard(),
            }
        );

        logger.info(`Partner ${partner.name} went online`);
    }

    /**
     * Handle go offline
     */
    async handleGoOffline(ctx) {
        const partner = await this.getPartner(ctx);
        if (!partner) return;

        if (partner.currentOrder) {
            return ctx.reply(
                '⚠️ You have an active delivery. Complete it before going offline.'
            );
        }

        await partner.goOffline();

        await ctx.reply('🔴 You are now OFFLINE. Use /go_online to start receiving requests.');

        logger.info(`Partner ${partner.name} went offline`);
    }

    /**
     * Show current delivery
     */
    async showCurrentDelivery(ctx) {
        const partner = await this.getPartner(ctx);
        if (!partner) return;

        if (!partner.currentOrder) {
            return ctx.reply('No active delivery. Wait for new requests!');
        }

        const order = await Order.findById(partner.currentOrder).populate('user');

        if (!order) {
            partner.currentOrder = null;
            await partner.save();
            return ctx.reply('Order not found. Status cleared.');
        }

        const customer = order.user;

        const message = `
🚴 *Active Delivery*

📦 Order: \`${order.orderId}\`
📍 *Address:*
${order.deliveryAddress.address}

👤 *Customer:*
${customer.getFullName()}
${customer.phone || 'Phone not available'}

📋 *Items:*
${order.items.map((i) => `• ${i.productName} × ${i.quantity}`).join('\n')}

💰 *Order Total:* ₹${order.total.toFixed(0)}
    `.trim();

        const [longitude, latitude] = order.deliveryAddress.location.coordinates;
        const navLink = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

        const buttons = [
            [Markup.button.url('🗺️ Navigate', navLink)],
        ];

        if (order.status === 'confirmed' || order.status === 'preparing') {
            buttons.push([Markup.button.callback('📦 Picked Up', `delivery_status_${order._id}_out_for_delivery`)]);
        }

        if (order.status === 'out_for_delivery') {
            if (order.paymentMethod === 'cod' && order.paymentStatus !== 'completed') {
                buttons.push([Markup.button.callback('💵 Mark as Paid & Delivered', `delivery_paid_delivered_${order._id}`)]);
            } else {
                buttons.push([Markup.button.callback('✅ Mark Delivered', `delivery_status_${order._id}_delivered`)]);
            }
        }

        await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(buttons));
    }

    /**
     * Accept delivery
     */
    async acceptDelivery(ctx, orderId) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Accepting delivery...').catch(() => { });

            const partner = await this.getPartner(ctx);
            if (!partner) return;

            const { order } = await deliveryService.acceptOrder(partner._id, orderId);

            await ctx.reply(
                `
✅ *Delivery Accepted!*

Order: \`${order.orderId}\`

Use /my_delivery to view details and navigate.
        `.trim(),
                { parse_mode: 'Markdown' }
            );

            // Notify customer
            const user = await User.findById(order.user);
            if (user) {
                const botService = require('./botService');
                await botService.notifyDeliveryAssignment(order, user, partner);
            }

            logger.info(`Partner ${partner.name} accepted order ${order.orderId}`);
        } catch (error) {
            logger.error('Error accepting delivery:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Reject delivery
     */
    async rejectDelivery(ctx, orderId) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Rejecting...').catch(() => { });

            const partner = await this.getPartner(ctx);
            if (!partner) return;

            await deliveryService.rejectOrder(partner._id, orderId);

            await ctx.reply('❌ Delivery rejected. Waiting for next request...');

            logger.info(`Partner ${partner.name} rejected order ${orderId}`);
        } catch (error) {
            logger.error('Error rejecting delivery:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Update delivery status
     */
    async updateDeliveryStatus(ctx, orderId, status) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Updating status...').catch(() => { });

            const partner = await this.getPartner(ctx);
            if (!partner) return;

            const order = await Order.findById(orderId).populate('user');
            if (order.paymentMethod === 'cod' && status === 'delivered' && order.paymentStatus !== 'completed') {
                return ctx.reply('⚠️ For COD orders, please use "Mark as Paid & Delivered" button to confirm payment.');
            }

            const updatedOrder = await deliveryService.updateDeliveryStatus(
                partner._id,
                orderId,
                status
            );

            const statusMessages = {
                out_for_delivery: '🚴 Order picked up! On the way to customer.',
                delivered: '✅ Order delivered successfully!',
            };

            await ctx.reply(statusMessages[status] || `Status updated to: ${status}`);

            // Notify customer
            const user = updatedOrder.user;
            if (user) {
                const botService = require('./botService');
                await botService.notifyOrderUpdate(updatedOrder, user);
            }

            if (status === 'delivered') {
                const earnings = deliveryService.calculateDeliveryEarnings(0);
                await ctx.reply(`💵 You earned ₹${earnings} for this delivery!`);
                await this.showPartnerStatus(ctx);
            }

            logger.info(`Partner ${partner.name} updated order ${updatedOrder.orderId} to ${status}`);
        } catch (error) {
            logger.error('Error updating delivery status:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Handle COD Paid and Delivered
     */
    async handleCODPaymentAndDelivery(ctx, orderId) {
        try {
            if (ctx.callbackQuery) await ctx.answerCbQuery('Processing COD Delivery...').catch(() => { });

            const partner = await this.getPartner(ctx);
            if (!partner) return;

            const order = await Order.findById(orderId);
            if (!order) throw new Error('Order not found');

            // 1. Mark Payment as Completed
            order.paymentStatus = 'completed';
            await order.save();

            // 2. Mark Delivery as Completed
            await deliveryService.updateDeliveryStatus(partner._id, orderId, 'delivered');

            await ctx.reply('✅ Payment confirmed and order delivered successfully!');

            // Notify customer
            const user = await User.findById(order.user);
            if (user) {
                const botService = require('./botService');
                const updatedOrder = await Order.findById(orderId);
                await botService.notifyOrderUpdate(updatedOrder, user);
            }

            // Show earnings
            const earnings = deliveryService.calculateDeliveryEarnings(0);
            await ctx.reply(`💵 You earned ₹${earnings} for this delivery!`);

            await this.showPartnerStatus(ctx);

            logger.info(`Partner ${partner.name} completed COD order ${order.orderId}`);
        } catch (error) {
            logger.error('Error in handleCODPaymentAndDelivery:', error);
            ctx.reply(`❌ ${error.message}`);
        }
    }

    /**
     * Show navigation
     */
    async showNavigation(ctx, orderId) {
        const order = await Order.findById(orderId);

        if (!order) {
            return ctx.reply('Order not found.');
        }

        const [longitude, latitude] = order.deliveryAddress.location.coordinates;
        const navLink = deliveryService.getNavigationLink(latitude, longitude);

        await ctx.reply(
            `🗺️ Navigate to: ${order.deliveryAddress.address}`,
            Markup.inlineKeyboard([
                [Markup.button.url('Open in Google Maps', navLink)],
            ])
        );
    }

    /**
     * Show earnings
     */
    async showEarnings(ctx) {
        const partner = await this.getPartner(ctx);
        if (!partner) return;

        const { stats, earnings } = partner;

        // Calculate today's earnings
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEarnings = earnings
            .filter((e) => new Date(e.createdAt) >= today)
            .reduce((sum, e) => sum + e.amount, 0);

        // This week's earnings
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEarnings = earnings
            .filter((e) => new Date(e.createdAt) >= weekStart)
            .reduce((sum, e) => sum + e.amount, 0);

        const message = `
💰 *Your Earnings*

📊 *Stats:*
• Total Deliveries: ${stats.totalDeliveries}
• Completed: ${stats.completedDeliveries}
• Cancelled: ${stats.cancelledDeliveries}
• Rating: ⭐ ${stats.averageRating.toFixed(1)}/5

💵 *Earnings:*
• Today: ₹${todayEarnings}
• This Week: ₹${weekEarnings}
• Total: ₹${stats.totalEarnings}
• Pending Payout: ₹${stats.pendingEarnings}
    `.trim();

        await ctx.replyWithMarkdown(message);
    }

    /**
     * Show partner status
     */
    async showPartnerStatus(ctx) {
        const partner = await this.getPartner(ctx);
        if (!partner) return;

        const statusEmoji = partner.isOnline ? '🟢' : '🔴';
        const availabilityEmoji = partner.isAvailable ? '✅' : '❌';

        const message = `
🚴 *Partner Status*

👤 ${partner.name}
📱 ${partner.phone}

${statusEmoji} Online: ${partner.isOnline ? 'Yes' : 'No'}
${availabilityEmoji} Available: ${partner.isAvailable ? 'Yes' : 'No'}
📍 Location: ${partner.currentLocation.coordinates.join(', ') || 'Not shared'}

🚗 Vehicle: ${partner.vehicleType}
📄 Documents: ${partner.documents.verified ? '✅ Verified' : '⏳ Pending'}

⭐ Rating: ${partner.stats.averageRating.toFixed(1)}/5 (${partner.stats.totalRatings} reviews)
    `.trim();

        await ctx.replyWithMarkdown(
            message,
            Markup.inlineKeyboard([
                [
                    partner.isOnline
                        ? Markup.button.callback('🔴 Go Offline', 'partner_go_offline')
                        : Markup.button.callback('🟢 Go Online', 'partner_go_online'),
                ],
                [Markup.button.callback('💰 View Earnings', 'partner_earnings')],
            ])
        );
    }

    /**
     * Broadcast delivery request to partner
     */
    async broadcastDeliveryRequest(partner, order) {
        const [longitude, latitude] = order.deliveryAddress.location.coordinates;

        // Calculate distance
        const partnerLoc = partner.currentLocation.coordinates;
        const distance = deliveryService.calculateDistance(
            partnerLoc[1],
            partnerLoc[0],
            latitude,
            longitude
        );

        const eta = Math.ceil(distance * 3);
        const earnings = deliveryService.calculateDeliveryEarnings(distance);

        const message = `
🔔 *New Delivery Request*

📦 Order: \`${order.orderId}\`
📍 Distance: ${distance.toFixed(2)} km
⏱ ETA: ~${eta} mins
💵 Earn: ₹${earnings}

📋 *Items:*
${order.items.map((i) => `• ${i.productName} × ${i.quantity}`).join('\n')}

💰 *Order Value:* ₹${order.total.toFixed(0)}

📍 *Deliver to:*
${order.deliveryAddress.address}

⏰ *Respond within 60 seconds*
    `.trim();

        try {
            await this.bot.telegram.sendMessage(partner.telegramId, message, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('✅ Accept', `accept_delivery_${order._id}`),
                        Markup.button.callback('❌ Reject', `reject_delivery_${order._id}`),
                    ],
                ]),
            });

            logger.info(`Delivery request sent to partner ${partner.name} for order ${order.orderId}`);
            return true;
        } catch (error) {
            logger.error('Error sending delivery request:', error);
            return false;
        }
    }

    /**
     * Get partner from context
     */
    async getPartner(ctx) {
        const telegramId = ctx.from.id.toString();
        const partner = await DeliveryPartner.findOne({ telegramId });

        if (!partner) {
            await ctx.reply(
                'You are not registered as a delivery partner. Use /partner_register to apply.'
            );
            return null;
        }

        return partner;
    }
}

module.exports = DeliveryBotHandler;
