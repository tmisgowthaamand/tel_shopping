const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        name: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['super_admin', 'admin', 'manager'],
            default: 'admin',
        },
        permissions: {
            products: { type: Boolean, default: true },
            orders: { type: Boolean, default: true },
            users: { type: Boolean, default: false },
            partners: { type: Boolean, default: false },
            analytics: { type: Boolean, default: false },
            settings: { type: Boolean, default: false },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        refreshTokens: [
            {
                token: { type: String },
                expiresAt: { type: Date },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
adminSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save();
};

// Static method to create default admin
adminSchema.statics.createDefaultAdmin = async function (email, password) {
    const existingAdmin = await this.findOne({ email });
    if (!existingAdmin) {
        await this.create({
            email,
            password,
            name: 'Super Admin',
            role: 'super_admin',
            permissions: {
                products: true,
                orders: true,
                users: true,
                partners: true,
                analytics: true,
                settings: true,
            },
        });
    }
};

module.exports = mongoose.model('Admin', adminSchema);
