const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    priceAtAdd: {
        type: Number,
        required: true,
    },
    discountAtAdd: {
        type: Number,
        default: 0,
    },
    size: {
        type: String,
        default: null,
    },
});

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        items: [cartItemSchema],
        subtotal: {
            type: Number,
            default: 0,
        },
        discount: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            default: 0,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Method to add item to cart
cartSchema.methods.addItem = async function (productId, quantity, price, discount = 0, size = null) {
    const existingItem = this.items.find(
        (item) => {
            const itemProdId = item.product?._id || item.product;
            return itemProdId &&
                itemProdId.toString() === productId.toString() &&
                item.size === size;
        }
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        this.items.push({
            product: productId,
            quantity,
            priceAtAdd: price,
            discountAtAdd: discount,
            size: size,
        });
    }

    await this.calculateTotals();
    await this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = async function (productId, quantity) {
    const item = this.items.find(
        (item) => {
            const itemProdId = item.product?._id || item.product;
            return itemProdId && itemProdId.toString() === productId.toString();
        }
    );

    if (item) {
        if (quantity <= 0) {
            this.items = this.items.filter(
                (item) => {
                    const itemProdId = item.product?._id || item.product;
                    return itemProdId && itemProdId.toString() !== productId.toString();
                }
            );
        } else {
            item.quantity = quantity;
        }
        await this.calculateTotals();
        await this.save();
    }
};

// Method to remove item
cartSchema.methods.removeItem = async function (productId) {
    this.items = this.items.filter(
        (item) => {
            const itemProdId = item.product?._id || item.product;
            return itemProdId && itemProdId.toString() !== productId.toString();
        }
    );
    await this.calculateTotals();
    await this.save();
};

// Method to calculate totals
cartSchema.methods.calculateTotals = async function () {
    await this.populate('items.product');

    let subtotal = 0;
    let discount = 0;

    for (const item of this.items) {
        if (item.product) {
            const itemTotal = item.product.price * item.quantity;
            const itemDiscount =
                (item.product.price * item.product.discount * item.quantity) / 100;
            subtotal += itemTotal;
            discount += itemDiscount;
        }
    }

    // Final safeguard: filter out any items with missing products that survived
    this.items = this.items.filter(item => item.product);

    this.subtotal = subtotal;
    this.discount = discount;
    this.total = Math.max(0, subtotal - discount);
    this.lastUpdated = new Date();
};

// Method to clear cart
cartSchema.methods.clear = async function () {
    this.items = [];
    this.subtotal = 0;
    this.discount = 0;
    this.total = 0;
    await this.save();
};

// Static method to get or create cart
cartSchema.statics.getOrCreate = async function (userId) {
    let cart = await this.findOne({ user: userId }).populate('items.product');

    if (!cart) {
        cart = await this.create({ user: userId, items: [] });
    }

    return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
