const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const orderRoutes = require('./orderRoutes');
const partnerRoutes = require('./partnerRoutes');
const userRoutes = require('./userRoutes');
const webhookRoutes = require('./webhookRoutes');
const notificationRoutes = require('./notificationRoutes');

module.exports = {
    authRoutes,
    productRoutes,
    categoryRoutes,
    orderRoutes,
    partnerRoutes,
    partnerPortalRoutes: require('./partnerPortalRoutes'),
    userRoutes,
    webhookRoutes,
    settingsRoutes: require('./settingsRoutes'),
    notificationRoutes,
};
