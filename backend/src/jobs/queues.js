const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
const config = require('../config');
const logger = require('../utils/logger');
const { orderService } = require('../services');
const { botService } = require('../bot');
const { User } = require('../models');

// Queue names
const QUEUES = {
    ORDER_EXPIRY: 'order-expiry',
    DELIVERY_ASSIGNMENT: 'delivery-assignment',
    NOTIFICATIONS: 'notifications',
};

// State
let connection = null;
let orderExpiryQueue = null;
let deliveryQueue = null;
let notificationQueue = null;
let redisAvailable = false;
let initialized = false;

/**
 * Robustly initialize Redis connection
 */
async function initRedis() {
    if (initialized) return;

    try {
        const url = new URL(config.redis.url);
        const redisOptions = {
            host: url.hostname || 'localhost',
            port: parseInt(url.port) || 6379,
            maxRetriesPerRequest: null,
            connectTimeout: 2000,
            retryStrategy: (times) => {
                if (times > 1) return null; // Fail fast after 1 retry
                return 100;
            }
        };

        const client = new Redis(redisOptions);

        // Wait for connection or failure
        await new Promise((resolve) => {
            let handled = false;

            client.once('ready', () => {
                if (!handled) {
                    logger.info('Queues Redis Connected Successfully');
                    connection = client;
                    redisAvailable = true;
                    handled = true;
                    resolve();
                }
            });

            client.once('error', (err) => {
                if (!handled) {
                    const isLocal = config.redis.url.includes('localhost') || config.redis.url.includes('127.0.0.1');

                    if (isLocal && config.nodeEnv === 'development') {
                        logger.info('Local Redis not found, using Mock Redis for development');
                    } else {
                        logger.warn(`Redis connection failed (${config.redis.url}), switching to mock:`, err.message);
                    }

                    client.removeAllListeners('error');
                    client.on('error', () => { });
                    try { client.disconnect(); } catch (e) { }

                    connection = new RedisMock();
                    redisAvailable = true;
                    handled = true;
                    resolve();
                }
            });

            // Timeout
            setTimeout(() => {
                if (!handled) {
                    logger.warn('Queues Redis connection timed out, using mock');
                    try { client.disconnect(); } catch (e) { }
                    connection = new RedisMock();
                    redisAvailable = true;
                    handled = true;
                    resolve();
                }
            }, 2500);
        });

        // Setup the queues and workers
        setupQueues();
        initialized = true;
    } catch (error) {
        logger.error('Critical error in queues init:', error.message);
        connection = new RedisMock();
        redisAvailable = true;
        setupQueues();
        initialized = true;
    }
}

function setupQueues() {
    const queueOptions = { connection };

    orderExpiryQueue = new Queue(QUEUES.ORDER_EXPIRY, queueOptions);
    deliveryQueue = new Queue(QUEUES.DELIVERY_ASSIGNMENT, queueOptions);
    notificationQueue = new Queue(QUEUES.NOTIFICATIONS, queueOptions);

    // Prevent crashes from queue event emitters
    [orderExpiryQueue, deliveryQueue, notificationQueue].forEach(q => {
        q.on('error', (err) => logger.error(`Queue ${q.name} error:`, err.message));
    });
}

/**
 * Initialize queue schedulers (Deprecated in BullMQ v5)
 */
const initSchedulers = () => {
    // BullMQ v5+ doesn't need QueueScheduler
};

/**
 * Initialize workers
 */
const initWorkers = () => {
    if (!connection) return;

    const workerOptions = { connection };

    // Workers
    const workers = [
        new Worker(QUEUES.ORDER_EXPIRY, async (job) => {
            logger.info(`Processing order expiry: ${job.id}`);
            const count = await orderService.autoCancelExpiredOrders();
            return { cancelled: count };
        }, workerOptions),

        new Worker(QUEUES.DELIVERY_ASSIGNMENT, async (job) => {
            const { orderId } = job.data;
            const { deliveryService } = require('../services');
            const partner = await deliveryService.assignPartner(orderId);
            return { partnerId: partner?._id };
        }, workerOptions),

        new Worker(QUEUES.NOTIFICATIONS, async (job) => {
            const { type, userId, data } = job.data;
            const user = await User.findById(userId);
            if (!user) return;
            await handleNotification(type, user, data);
            return { sent: true };
        }, workerOptions)
    ];

    workers.forEach(w => {
        w.on('error', err => logger.error(`Worker error:`, err.message));
        w.on('failed', (job, err) => logger.error(`Job ${job.id} failed:`, err.message));
    });

    logger.info('Workers initialized');
};

async function handleNotification(type, user, data) {
    switch (type) {
        case 'order_status': await botService.notifyOrderUpdate(data.order, user); break;
        case 'payment_success': await botService.notifyPaymentSuccess(data.order, user); break;
        case 'auto_cancel': await botService.notifyAutoCancellation(data.order, user); break;
        case 'delivery_assigned': await botService.notifyDeliveryAssignment(data.order, user, data.partner); break;
        case 'admin_new_order': await botService.notifyAdminNewOrder(data.order, user); break;
        case 'admin_status_update': await botService.notifyAdminStatusUpdate(data.order, user); break;
    }
}

const scheduleRecurringJobs = async () => {
    if (!orderExpiryQueue) return;
    try {
        await orderExpiryQueue.add('check-expired-orders', {}, {
            repeat: { every: 60 * 1000 }
        });
        logger.info('Recurring jobs scheduled');
    } catch (e) {
        logger.error('Schedule failed:', e.message);
    }
};

const addDeliveryAssignmentJob = async (orderId) => {
    if (!deliveryQueue || connection instanceof RedisMock) {
        setTimeout(async () => {
            const { deliveryService } = require('../services');
            await deliveryService.assignPartner(orderId).catch(e => logger.error('Fallback assignment failed', e));
        }, 1000);
        return;
    }
    await deliveryQueue.add('assign-delivery', { orderId }, { delay: 1000 });
};

const addNotificationJob = async (type, userId, data) => {
    if (!notificationQueue || connection instanceof RedisMock) {
        setImmediate(async () => {
            const user = await User.findById(userId);
            if (user) await handleNotification(type, user, data).catch(e => logger.error('Fallback notification failed', e));
        });
        return;
    }
    await notificationQueue.add('send-notification', { type, userId, data });
};

module.exports = {
    QUEUES,
    get orderExpiryQueue() { return orderExpiryQueue; },
    get deliveryQueue() { return deliveryQueue; },
    get notificationQueue() { return notificationQueue; },
    initRedis, // Explicit init
    initSchedulers,
    initWorkers,
    scheduleRecurringJobs,
    addDeliveryAssignmentJob,
    addNotificationJob,
};
