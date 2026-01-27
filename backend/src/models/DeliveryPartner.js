const mongoose = require('mongoose');

const deliveryPartnerSchema = new mongoose.Schema(
    {
        telegramId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            default: null,
        },
        avatar: {
            type: String,
            default: null,
        },
        vehicleType: {
            type: String,
            enum: ['bike', 'scooter', 'car', 'bicycle'],
            default: 'bike',
        },
        vehicleNumber: {
            type: String,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isOnline: {
            type: Boolean,
            default: false,
            index: true,
        },
        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },
        currentLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },
        currentOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        stats: {
            totalDeliveries: { type: Number, default: 0 },
            completedDeliveries: { type: Number, default: 0 },
            cancelledDeliveries: { type: Number, default: 0 },
            totalEarnings: { type: Number, default: 0 },
            pendingEarnings: { type: Number, default: 0 },
            averageRating: { type: Number, default: 5, min: 0, max: 5 },
            totalRatings: { type: Number, default: 0 },
        },
        earnings: [
            {
                orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
                amount: { type: Number },
                type: { type: String, enum: ['delivery', 'bonus', 'penalty'] },
                status: { type: String, enum: ['pending', 'paid'] },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        documents: {
            idProof: { type: String },
            drivingLicense: { type: String },
            vehicleRC: { type: String },
            verified: { type: Boolean, default: false },
        },
        bankDetails: {
            accountNumber: { type: String },
            ifscCode: { type: String },
            accountName: { type: String },
        },
        lastOnlineAt: {
            type: Date,
            default: null,
        },
        ratings: [
            {
                orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                rating: { type: Number, min: 1, max: 5 },
                review: { type: String },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        password: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
deliveryPartnerSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const bcrypt = require('bcryptjs');
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
deliveryPartnerSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(candidatePassword, this.password);
};

// Geospatial index for location-based queries
deliveryPartnerSchema.index({ currentLocation: '2dsphere' });

// Method to go online
deliveryPartnerSchema.methods.goOnline = async function (longitude, latitude) {
    this.isOnline = true;
    this.isAvailable = !this.currentOrder;
    this.currentLocation.coordinates = [longitude, latitude];
    this.currentLocation.lastUpdated = new Date();
    this.lastOnlineAt = new Date();
    await this.save();
};

// Method to go offline
deliveryPartnerSchema.methods.goOffline = async function () {
    this.isOnline = false;
    this.isAvailable = false;
    await this.save();
};

// Method to update location
deliveryPartnerSchema.methods.updateLocation = async function (longitude, latitude) {
    this.currentLocation.coordinates = [longitude, latitude];
    this.currentLocation.lastUpdated = new Date();
    await this.save();
};

// Method to accept order
deliveryPartnerSchema.methods.acceptOrder = async function (orderId) {
    this.currentOrder = orderId;
    this.isAvailable = false;
    this.stats.totalDeliveries += 1;
    await this.save();
};

// Method to complete delivery
deliveryPartnerSchema.methods.completeDelivery = async function (orderId, earningAmount) {
    this.currentOrder = null;
    this.isAvailable = true;
    this.stats.completedDeliveries += 1;
    this.stats.totalEarnings += earningAmount;
    this.stats.pendingEarnings += earningAmount;

    this.earnings.push({
        orderId,
        amount: earningAmount,
        type: 'delivery',
        status: 'pending',
    });

    await this.save();
};

// Method to add rating
deliveryPartnerSchema.methods.addRating = async function (orderId, userId, rating, review = '') {
    this.ratings.push({
        orderId,
        userId,
        rating,
        review,
    });

    // Recalculate average rating
    const totalRating = this.ratings.reduce((sum, r) => sum + r.rating, 0);
    this.stats.totalRatings = this.ratings.length;
    this.stats.averageRating = totalRating / this.ratings.length;

    await this.save();
};

// Static method to find nearby available partners
deliveryPartnerSchema.statics.findNearby = async function (longitude, latitude, radiusKm = 5) {
    return this.find({
        isActive: true,
        isOnline: true,
        isAvailable: true,
        currentLocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
                $maxDistance: radiusKm * 1000, // Convert to meters
            },
        },
    }).sort({ 'stats.averageRating': -1 });
};

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
