require('dotenv').config();

const connectDB = require('../config/database');
const { Category, Product, Admin, DeliveryPartner } = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

const categoriesBase = [
    { name: 'Face', slug: 'face', icon: '✨', description: 'Foundation, concealer, blush, and bronzer for a flawless finish.', image: 'https://www.rarebeauty.com/cdn/shop/files/ECOMM-WW-POWDER-BRONZER-SUMMER-FEELS.jpg?v=1767661488' },
    { name: 'Lips', slug: 'lips', icon: '💄', description: 'Lipsticks, oils, and liners for the perfect pout.', image: 'https://www.rarebeauty.com/cdn/shop/files/ECOMM-SOFT-PINCH-TINTED-LIP-OIL-SERENITY.jpg?v=1762284990' },
    { name: 'Eyes', slug: 'eyes', icon: '👁️', description: 'Mascara, brows, and eyeshadow for an expressive look.', image: 'https://www.rarebeauty.com/cdn/shop/files/ECOMM-BROW-HARMONY-LIFTING-GEL-CLOSED.jpg?v=1762295534' },
    { name: 'Tools', slug: 'tools', icon: '🖌️', description: 'Professional brushes and sponges for seamless application.', image: 'https://www.rarebeauty.com/cdn/shop/files/ECOMM-BRONZER-BRUSH-01.jpg?v=1767763081' }
];

const rareProducts = [
    {
        name: "Warm Wishes Soft Matte Powder Bronzer",
        price: 30,
        category: "face",
        description: "An ultra-smooth bronzing powder with a blurred matte finish that gives skin a natural sunlit warmth all day long. This breathable formula is enriched with fine-milled pigments that blend like a dream.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-WW-POWDER-BRONZER-SUMMER-FEELS.jpg?v=1767661488",
        isFeatured: true
    },
    {
        name: "Soft Pinch Liquid Blush",
        price: 25,
        category: "face",
        description: "A viral bestseller. This weightless liquid blush delivers high-impact color with just one dot, blending seamlessly for a pinch-perfect flush that lasts all day.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-SP-LIQUID-BLUSH-MATTE-BLISS.jpg?v=1727895258",
        isFeatured: true
    },
    {
        name: "Soft Pinch Liquid Contour",
        price: 30,
        category: "face",
        description: "A weightless, easy-to-blend liquid contour that defines and sculpts with a natural-looking finish. The targeted applicator makes it easy to add depth exactly where you want it.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-SOFT-PINCH-LIQUID-CONTOUR-GENTLE.jpg?v=1762300534",
        isFeatured: false
    },
    {
        name: "Positive Light Liquid Luminizer",
        price: 28,
        category: "face",
        description: "A silky, second-skin liquid highlighter that creates a lasting, soft-focus glow while skin remains illuminated and hydrated.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-PL-LIQUID-LUMINIZER-REFLECT-1440x1952.jpg?v=1724695808",
        isFeatured: true
    },
    {
        name: "Kind Words Matte Lip Liner",
        price: 18,
        category: "lips",
        description: "A super creamy, waterproof lip liner that glides on like a balm to define and shape lips with rich, stay-put color and a comfortable matte finish.",
        image_url: "https://www.rarebeauty.com/cdn/shop/products/lip-liner-talented-sku.jpg?v=1762300534",
        isFeatured: false
    },
    {
        name: "Find Comfort Lip Butter",
        price: 18,
        category: "lips",
        description: "A lightweight, buttery lip balm that provides a hint of color and a healthy shine while keeping lips hydrated and soft.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-FC-LIP-BUTTER-FRIENDLY-CLOSED.jpg?v=1764718812",
        isFeatured: false
    },
    {
        name: "Soft Pinch Tinted Lip Oil",
        price: 24,
        category: "lips",
        description: "An innovative lip jelly that transforms into a lightweight oil, leaving a hint of color and shine that's never sticky and feels incredible on the lips.",
        image_url: "https://www.rarebeauty.com/cdn/shop/products/soft-pinch-tinted-lip-oil-serenity-1440x1952.jpg?v=1762284990",
        isFeatured: true
    },
    {
        name: "Brow Harmony Flexible Lifting Gel",
        price: 17,
        category: "eyes",
        description: "A clear eyebrow gel that lifts, shapes, and holds brow hairs in place all day with a flexible finish that never feels stiff or flaky.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-BROW-HARMONY-LIFTING-GEL-CLOSED.jpg?v=1762295534",
        isFeatured: false
    },
    {
        name: "Perfect Strokes Universal Volumizing Mascara",
        price: 20,
        category: "eyes",
        description: "A universal mascara created for every lash type to lift, lengthen, curl, and volumize every single lash for a wide-eyed look.",
        image_url: "https://www.rarebeauty.com/cdn/shop/products/Mascara-Full-Size-Open-Mascara.jpg?v=1762276044",
        isFeatured: true
    },
    {
        name: "Angled Powder Brush",
        price: 30,
        category: "tools",
        description: "A soft, angled brush designed for precise application of powder bronzer and blush, helping you sculpt and define with ease.",
        image_url: "https://www.rarebeauty.com/cdn/shop/files/ECOMM-BRONZER-BRUSH-01.jpg?v=1767763081",
        isFeatured: false
    },
    {
        name: "Soft Pinch Blush Brush",
        price: 26,
        category: "tools",
        description: "A pointed, flexible brush that fits every angle of the face for seamless blending of liquid and cream blushes for a natural flush.",
        image_url: "https://www.rarebeauty.com/cdn/shop/products/Blush-Brush-Side-SKU.jpg?v=1762276047",
        isFeatured: false
    },
    {
        name: "Liquid Touch Foundation Brush",
        price: 30,
        category: "tools",
        description: "A uniquely shaped foundation brush that mimics the feel of your fingertips for a seamless finish and easy blending.",
        image_url: "https://www.rarebeauty.com/cdn/shop/products/FOUNDATION-BRUSH-SKU-1.jpg?v=1762200389",
        isFeatured: false
    },
    {
        name: "Positive Light Precision Highlighter Brush",
        price: 20,
        category: "tools",
        description: "A soft, tapered brush designed for precise application of liquid and powder highlighters, giving you a targeted glow.",
        image_url: "https://www.rarebeauty.com/cdn/shop/products/positive-light-precision-brush-1440x1952.jpg?v=1762283503",
        isFeatured: false
    }
];

async function seed() {
    try {
        await connectDB();
        logger.info('Connected to database');

        // Clear existing data
        await Category.deleteMany({});
        await Product.deleteMany({});
        logger.info('Cleared existing data');

        // Create categories
        const createdCategories = {};
        for (const cat of categoriesBase) {
            const created = await Category.create(cat);
            createdCategories[cat.slug] = created._id;
            logger.info(`Created category: ${cat.name}`);
        }

        // Create products
        let count = 0;
        for (const prod of rareProducts) {
            const categoryId = createdCategories[prod.category];

            await Product.create({
                name: prod.name,
                description: prod.description,
                shortDescription: prod.description.substring(0, 97) + '...',
                price: prod.price * 80, // Converting USD to INR roughly
                discount: Math.random() > 0.7 ? 10 : 0,
                stock: 50 + Math.floor(Math.random() * 100),
                category: categoryId,
                isFeatured: prod.isFeatured || false,
                tags: [prod.category, 'rare beauty', 'makeup', 'luxury'],
                images: [
                    {
                        url: prod.image_url,
                        alt: prod.name,
                        isPrimary: true,
                    },
                ],
                ratings: {
                    average: 4.5 + (Math.random() * 0.5),
                    count: 100 + Math.floor(Math.random() * 2000),
                },
            });
            count++;
            logger.info(`Created product: ${prod.name}`);
        }

        // Create a few more variations to fill up the shop
        for (let i = 1; i <= 20; i++) {
            const baseProd = rareProducts[i % rareProducts.length];
            const categoryId = createdCategories[baseProd.category];

            await Product.create({
                name: `${baseProd.name} - Shade ${i}`,
                description: baseProd.description,
                shortDescription: baseProd.description.substring(0, 97) + '...',
                price: baseProd.price * 80,
                discount: 0,
                stock: 20 + Math.floor(Math.random() * 100),
                category: categoryId,
                isFeatured: false,
                tags: [baseProd.category, 'rare beauty', 'makeup'],
                images: [
                    {
                        url: baseProd.image_url,
                        alt: baseProd.name,
                        isPrimary: true,
                    },
                ],
                ratings: {
                    average: 4.2 + (Math.random() * 0.8),
                    count: 50 + Math.floor(Math.random() * 500),
                },
            });
            count++;
        }

        // Create default admin if not exists (using findOneAndUpdate to preserve password if already hashed)
        await Admin.deleteMany({ email: config.admin.email });
        await Admin.create({
            email: config.admin.email,
            password: config.admin.password,
            name: 'Rare Beauty Admin',
            role: 'super_admin',
            permissions: {
                products: true,
                orders: true,
                users: true,
                partners: true,
                analytics: true,
                settings: true
            }
        });
        logger.info('Rare Beauty Admin created');

        // Restore delivery partners
        await DeliveryPartner.deleteMany({});
        const samplePartners = [
            {
                telegramId: '123456789',
                name: 'Express Runner',
                phone: '+91 9876543210',
                isActive: true,
                isOnline: true,
                isAvailable: true,
                vehicleType: 'bike',
                currentLocation: {
                    type: 'Point',
                    coordinates: [77.5946, 12.9716],
                },
                documents: { verified: true },
            },
            {
                telegramId: '98876532110',
                name: 'Beauty Delivery',
                phone: '+91 98876532110',
                isActive: true,
                isOnline: true,
                isAvailable: true,
                vehicleType: 'scooter',
                currentLocation: {
                    type: 'Point',
                    coordinates: [77.6146, 12.9316],
                },
                documents: { verified: true },
            }
        ];

        for (const p of samplePartners) {
            await DeliveryPartner.create(p);
        }
        logger.info('Delivery partners restored');

        logger.info(`Rare Beauty Seed completed! Total products: ${count}`);
        process.exit(0);
    } catch (error) {
        logger.error('Rare Beauty Seed failed:', error);
        process.exit(1);
    }
}

seed();
