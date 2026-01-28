const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['all', 'promo', 'order', 'system', 'payment'],
        default: 'all'
    },
    category: {
        type: String,
        enum: ['buyer', 'seller', 'admin', 'partner', 'all'],
        default: 'all'
    },
    icon: {
        type: String,
        default: 'bell'
    },
    isHighlighted: {
        type: Boolean,
        default: false
    },
    link: {
        type: String,
        default: null
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    targetPartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner',
        default: null
    },
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        amount: Number,
        discount: String
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for quick queries
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1, category: 1 });
notificationSchema.index({ targetUserId: 1 });
notificationSchema.index({ isActive: 1 });

// Virtual for checking if notification is read
notificationSchema.methods.isReadBy = function (userId) {
    return this.readBy.some(r => r.userId.toString() === userId.toString());
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
    const notifications = await this.find({ isActive: true });
    let count = 0;
    for (const notif of notifications) {
        if (!notif.isReadBy(userId)) {
            count++;
        }
    }
    return count;
};

// Format for API response
notificationSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.id = obj._id;
    delete obj._id;
    delete obj.__v;
    return obj;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
