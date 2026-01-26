require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'],

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  },

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL,
    restUrl: process.env.REDIS_REST_URL,
    apiToken: process.env.REDIS_API_TOKEN,
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Google Maps
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  // Delivery Settings
  delivery: {
    radiusKm: parseInt(process.env.DELIVERY_RADIUS_KM) || 5,
    orderExpiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES) || 15,
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@atzstore.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  },

  // Groq AI
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // Google Sheets
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
  },

  // Brevo
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
  },
};
