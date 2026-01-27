const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        telegramId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        username: {
            type: String,
            default: null,
        },
        firstName: {
            type: String,
            default: null,
        },
        lastName: {
            type: String,
            default: null,
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        addresses: [
            {
                label: { type: String, default: 'Home' },
                address: { type: String },
                location: {
                    type: {
                        type: String,
                        enum: ['Point'],
                        default: 'Point',
                    },
                    coordinates: {
                        type: [Number], // [longitude, latitude]
                        default: [0, 0],
                    },
                },
                isDefault: { type: Boolean, default: false },
            },
        ],
        currentState: {
            type: String,
            enum: [
                'idle',
                'browsing',
                'viewing_product',
                'selecting_quantity',
                'viewing_cart',
                'entering_address',
                'selecting_payment',
                'awaiting_payment',
                'tracking_order',
            ],
            default: 'idle',
        },
        sessionData: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isBlacklisted: {
            type: Boolean,
            default: false,
        },
        blacklistReason: {
            type: String,
            default: null,
        },
        orderStats: {
            totalOrders: { type: Number, default: 0 },
            completedOrders: { type: Number, default: 0 },
            cancelledOrders: { type: Number, default: 0 },
            codOrders: { type: Number, default: 0 },
            totalSpent: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
    }
);

// Geospatial index for location-based queries
userSchema.index({ 'addresses.location': '2dsphere' });

// Method to get full name
userSchema.methods.getFullName = function () {
    return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.username || 'User';
};

// Method to get default address
userSchema.methods.getDefaultAddress = function () {
    return this.addresses.find((addr) => addr.isDefault) || this.addresses[0];
};

// Static method to find or create user
userSchema.statics.findOrCreateByTelegramId = async function (telegramData) {
    const telegramId = telegramData.id.toString();
    let user = await this.findOne({ telegramId });

    if (!user) {
        try {
            user = await this.create({
                telegramId,
                username: telegramData.username,
                firstName: telegramData.first_name,
                lastName: telegramData.last_name,
            });
        } catch (error) {
            // Handle race condition where user was created by parallel request
            if (error.code === 11000) {
                user = await this.findOne({ telegramId });
            } else {
                throw error;
            }
        }
    } else {
        // Update user info if changed
        let hasChanges = false;
        if (telegramData.username && user.username !== telegramData.username) {
            user.username = telegramData.username;
            hasChanges = true;
        }
        if (telegramData.first_name && user.firstName !== telegramData.first_name) {
            user.firstName = telegramData.first_name;
            hasChanges = true;
        }
        if (telegramData.last_name && user.lastName !== telegramData.last_name) {
            user.lastName = telegramData.last_name;
            hasChanges = true;
        }
        if (hasChanges) {
            await user.save();
        }
    }

    return user;
};

module.exports = mongoose.model('User', userSchema);
