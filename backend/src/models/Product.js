const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        shortDescription: {
            type: String,
            maxlength: 100,
        },
        images: [
            {
                url: { type: String, required: true },
                alt: { type: String },
                isPrimary: { type: Boolean, default: false },
            },
        ],
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        finalPrice: {
            type: Number,
            default: function () {
                return Math.round((this.price - (this.price * this.discount) / 100) * 100) / 100;
            },
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true,
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        reservedStock: {
            type: Number,
            default: 0,
            min: 0,
        },
        sku: {
            type: String,
            unique: true,
            sparse: true,
        },
        tags: [{ type: String }],
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        weight: {
            type: Number, // in grams
            default: 0,
        },
        dimensions: {
            length: { type: Number },
            width: { type: Number },
            height: { type: Number },
        },
        ratings: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0 },
        },
        sizes: [{ type: String }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual for available stock
productSchema.virtual('availableStock').get(function () {
    return Math.max(0, this.stock - this.reservedStock);
});

// Pre-save middleware to calculate final price
productSchema.pre('save', function (next) {
    this.finalPrice = Math.round((this.price - (this.price * this.discount) / 100) * 100) / 100;
    next();
});

// Method to get primary image
productSchema.methods.getPrimaryImage = function () {
    const primary = this.images.find((img) => img.isPrimary);
    return primary ? primary.url : this.images[0]?.url || null;
};

// Method to reserve stock
productSchema.methods.reserveStock = async function (quantity) {
    if (this.availableStock < quantity) {
        throw new Error('Insufficient stock');
    }
    this.reservedStock += quantity;
    await this.save();
};

// Method to release reserved stock
productSchema.methods.releaseStock = async function (quantity) {
    this.reservedStock = Math.max(0, this.reservedStock - quantity);
    await this.save();
};

// Method to deduct stock (on order confirmation)
productSchema.methods.deductStock = async function (quantity) {
    if (this.stock < quantity) {
        throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
    this.reservedStock = Math.max(0, this.reservedStock - quantity);
    await this.save();
};

// Search index
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
