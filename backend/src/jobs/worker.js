require('dotenv').config();
const connectDB = require('../config/database');
const { connectRedis } = require('../config/redis');
const { initRedis, initSchedulers, initWorkers, scheduleRecurringJobs } = require('./queues');
const { botService } = require('../bot');
const logger = require('../utils/logger');

/**
 * Standalone worker process
 * Run with: npm run worker
 */
const startWorker = async () => {
    logger.info('Starting worker process...');

    try {
        // Connect to MongoDB
        await connectDB();

        // Connect to Redis
        await connectRedis();


        // Initialize Bot Service (for notifications)
        await botService.initialize();

        // Initialize schedulers and workers
        await initRedis();
        initSchedulers();
        initWorkers();

        // Schedule recurring jobs
        await scheduleRecurringJobs();

        logger.info('Worker process started successfully');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down worker...');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('Shutting down worker...');
            process.exit(0);
        });
    } catch (error) {
        logger.error('Worker failed to start:', error);
        process.exit(1);
    }
};

startWorker();
