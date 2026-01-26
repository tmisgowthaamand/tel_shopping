require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const { apiLimiter } = require('./middleware');
const { botService, DeliveryBotHandler } = require('./bot');
const { initRedis, initSchedulers, initWorkers, scheduleRecurringJobs } = require('./jobs/queues');
const { initCronJobs } = require('./jobs/cron');
const { Admin } = require('./models');

// Import routes
const {
    authRoutes,
    productRoutes,
    categoryRoutes,
    orderRoutes,
    partnerRoutes,
    userRoutes,
    webhookRoutes,
} = require('./routes');

const app = express();

// Trust proxy for correct IP detection behind Render/Load Balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.allowedOrigins,
    credentials: true,
}));

// Rate limiting
app.use('/api', apiLimiter);

// Body parsing (except for webhooks that need raw body)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/users', userRoutes);

// Webhook Routes (separate from API)
app.use('/webhook', webhookRoutes);

// Error handling
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

/**
 * Initialize application
 */
async function initialize() {
    try {
        // Connect to MongoDB (Required)
        await connectDB();
        logger.info('Database connected');

        // Connect to Redis (Optional Fallback)
        connectRedis().catch(err => logger.warn('Redis init deferred:', err.message));

        // Create default admin
        await Admin.createDefaultAdmin(config.admin.email, config.admin.password);
        logger.info('Default admin ensured');

        // Initialize Telegram bot
        try {
            await botService.initialize();
            // Initialize delivery bot handlers
            const deliveryHandler = new DeliveryBotHandler(botService.getBot());
            deliveryHandler.initialize();
            // Start bot background task
            if (config.nodeEnv === 'production' && config.telegram.webhookUrl) {
                botService.startWebhook(app, '/webhook/telegram').catch(e => logger.error('Bot Webhook failed:', e));
            } else {
                botService.startPolling().catch(e => logger.error('Bot Polling failed:', e));
            }
        } catch (e) {
            logger.error('Bot initialization failed:', e);
        }

        // Initialize background job workers
        await initRedis();
        initSchedulers();
        initWorkers();
        scheduleRecurringJobs().catch(e => logger.warn('Recurring jobs fail:', e));
        initCronJobs();

        // Start server (Primary objective)
        app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
        });
    } catch (error) {
        logger.error('Critical initialization failure:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
});

// Start application
initialize();

module.exports = app;
