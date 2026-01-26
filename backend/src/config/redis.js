const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
    try {
        const url = new URL(config.redis.url);
        const redisOptions = {
            host: url.hostname || 'localhost',
            port: parseInt(url.port) || 6379,
            retryStrategy: (times) => {
                if (times > 1) return null; // Fail fast
                return 100;
            }
        };

        const client = new Redis(redisOptions);

        return new Promise((resolve) => {
            let resolved = false;

            client.once('ready', () => {
                logger.info('Redis Client Connected');
                redisClient = client;
                if (!resolved) {
                    resolved = true;
                    resolve(redisClient);
                }
            });

            client.on('error', (err) => {
                if (err.code === 'ECONNREFUSED' || err.message.includes('reached the max number of retries')) {
                    if (!redisClient || !(redisClient instanceof RedisMock)) {
                        const isLocal = config.redis.url.includes('localhost') || config.redis.url.includes('127.0.0.1');

                        if (isLocal && config.nodeEnv === 'development') {
                            logger.info('Redis not found on localhost, using Mock Redis');
                        } else {
                            logger.warn(`Main Redis connection failed (${config.redis.url}). Switching to ioredis-mock.`);
                        }

                        client.removeAllListeners('error');
                        client.on('error', () => { }); // Prevent crashes

                        redisClient = new RedisMock();
                        if (!resolved) {
                            resolved = true;
                            resolve(redisClient);
                        }
                    }
                } else {
                    logger.error('Redis Client Error:', err.message);
                }
            });

            // Timeout after 1 second if no ready or error
            setTimeout(() => {
                if (!resolved) {
                    logger.warn('Redis connection timeout, using mock');
                    redisClient = new RedisMock();
                    resolved = true;
                    resolve(redisClient);
                }
            }, 1000);
        });
    } catch (error) {
        logger.warn('Redis init error. Using mock.');
        redisClient = new RedisMock();
        return redisClient;
    }
};

const getRedisClient = () => {
    if (!redisClient) {
        logger.warn('Redis client accessed before initialization, providing mock');
        redisClient = new RedisMock();
    }
    return redisClient;
};

module.exports = { connectRedis, getRedisClient };
