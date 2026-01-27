const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    productName: {
        type: String,
        required: true,
    },
    productImage: {
        type: String,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    finalPrice: {
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
});

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            unique: true,
            default: () => `ATZ-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        items: [orderItemSchema],
        subtotal: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            default: 0,
        },
        deliveryFee: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: [
                'pending',
                'confirmed',
                'preparing',
                'ready_for_pickup',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'refunded',
            ],
            default: 'pending',
            index: true,
        },
        statusHistory: [
            {
                status: { type: String },
                timestamp: { type: Date, default: Date.now },
                note: { type: String },
                updatedBy: { type: String }, // 'system', 'admin', 'partner'
            },
        ],
        paymentMethod: {
            type: String,
            enum: ['razorpay', 'cod'],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: 'pending',
            index: true,
        },
        razorpayOrderId: {
            type: String,
            index: true,
            sparse: true,
        },
        razorpayPaymentLinkId: {
            type: String,
            index: true,
            sparse: true,
        },
        razorpayPaymentId: {
            type: String,
            sparse: true,
        },
        razorpaySignature: {
            type: String,
        },
        paymentLink: {
            type: String,
        },
        deliveryAddress: {
            address: { type: String, required: true },
            location: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point',
                },
                coordinates: {
                    type: [Number], // [longitude, latitude]
                    required: true,
                },
            },
        },
        deliveryPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryPartner',
            default: null,
        },
        deliveryAssignedAt: {
            type: Date,
            default: null,
        },
        estimatedDeliveryTime: {
            type: Date,
            default: null,
        },
        actualDeliveryTime: {
            type: Date,
            default: null,
        },
        deliveryNotes: {
            type: String,
            default: '',
        },
        expiresAt: {
            type: Date,
            index: true,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        cancellationReason: {
            type: String,
            default: null,
        },
        isFraudFlagged: {
            type: Boolean,
            default: false,
        },
        fraudReason: {
            type: String,
            default: null,
        },
        notes: {
            type: String,
            default: '',
        },
        paymentRetries: {
            type: Number,
            default: 0,
        },
        verifiedPaymentType: {
            type: String,
            enum: ['cash', 'upi', 'online'],
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Geospatial index
orderSchema.index({ 'deliveryAddress.location': '2dsphere' });

// Compound indexes for common queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, expiresAt: 1 });

// Pre-save middleware
orderSchema.pre('save', function (next) {
    // Set expiry for pending orders (10 minutes)
    if (this.isNew && this.status === 'pending' && this.paymentMethod === 'razorpay') {
        this.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }

    // Add to status history
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date(),
            updatedBy: 'system',
        });
    }

    next();
});

// Method to update status
orderSchema.methods.updateStatus = async function (newStatus, note = '', updatedBy = 'system') {
    this.status = newStatus;
    this.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note,
        updatedBy,
    });

    if (newStatus === 'cancelled') {
        this.cancelledAt = new Date();
    }

    if (newStatus === 'delivered') {
        this.actualDeliveryTime = new Date();
    }

    await this.save();
};

// Method to calculate ETA
orderSchema.methods.calculateETA = function (distanceKm, avgSpeedKmH = 25) {
    const travelTimeMinutes = (distanceKm / avgSpeedKmH) * 60;
    const prepTimeMinutes = 15; // Average prep time
    const totalMinutes = travelTimeMinutes + prepTimeMinutes;

    this.estimatedDeliveryTime = new Date(
        Date.now() + totalMinutes * 60 * 1000
    );

    return this.estimatedDeliveryTime;
};

// Static method to get expired unpaid orders
orderSchema.statics.getExpiredUnpaidOrders = async function () {
    return this.find({
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'razorpay',
        expiresAt: { $lte: new Date() },
    });
};

// Static method to get orders for delivery assignment
orderSchema.statics.getOrdersForDeliveryAssignment = async function () {
    return this.find({
        status: { $in: ['confirmed', 'preparing', 'ready_for_pickup'] },
        deliveryPartner: null,
    })
        .populate('user')
        .sort({ createdAt: 1 });
};

module.exports = mongoose.model('Order', orderSchema);
