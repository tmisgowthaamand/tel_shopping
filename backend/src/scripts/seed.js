require('dotenv').config();

const connectDB = require('../config/database');
const { Category, Product, Admin, DeliveryPartner } = require('../models');
const logger = require('../utils/logger');
const config = require('../config');

const categoriesBase = [
    { name: 'Electronics', slug: 'electronics', icon: '📱', description: 'Premium gadgets, smartphones, and professional hardware', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80' },
    { name: 'Fashion', slug: 'fashion', icon: '👕', description: 'Curated apparel, footwear, and luxury accessories', image: 'https://images.unsplash.com/photo-1445205170230-053b830c6050?w=800&q=80' },
    { name: 'Groceries', slug: 'groceries', icon: '🛒', description: 'Fresh organic produce and premium pantry essentials', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', icon: '🏠', description: 'Modern appliances and elegant home decor', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80' },
    { name: 'Beauty', slug: 'beauty', icon: '💄', description: 'Luxury skincare, cosmetics, and self-care products', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80' },
    { name: 'Sports', slug: 'sports', icon: '⚽', description: 'Professional sports gear and fitness equipment', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80' },
    { name: 'Books', slug: 'books', icon: '📚', description: 'International bestsellers and educational resources', image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80' }
];

const imagePool = {
    electronics: [
        'photo-1496181133206-80ce9b88a853', 'photo-1511707171634-5f897ff02aa9', 'photo-1505740420928-5e560c06d30e',
        'photo-1516035069371-29a1b244cc32', 'photo-1523275336654-798e401ba63f', 'photo-1511467687858-23d96c32e4ae',
        'photo-1486401899868-2e997a59aa7a', 'photo-1473968512647-3e447244af8f', 'photo-1608156639585-34a070558c73',
        'photo-1544244015-0df4b3ffc6b0'
    ],
    fashion: [
        'photo-1551028719-00167b16eac5', 'photo-1542291026-7eec264c27ff', 'photo-1524592094714-0f0654e20314',
        'photo-1584917865442-de89df76afd3', 'photo-1542272604-787c3835535d', 'photo-1521572163474-6864f9cf17ab',
        'photo-1434389677669-e08b4cac3105', 'photo-1511499767150-a48a237f0083', 'photo-1539008835060-4473217bdc6a',
        'photo-1624222247344-550fb8ec55ec'
    ],
    groceries: [
        'photo-1587049352846-4a222e784d38', 'photo-1495474472287-4d71bcdd2085', 'photo-1474979266404-7eaacabc8705',
        'photo-1564890369478-c89fe6cfabc4', 'photo-1536620959070-512a17e301fc', 'photo-1586439702132-55018671b996',
        'photo-1473093226795-af9932fe5856', 'photo-1586201375761-83865001e31c', 'photo-1596040033229-a9821ebd058d',
        'photo-1511381939415-e44015466834'
    ],
    'home-kitchen': [
        'photo-1556910103-1c02745aae4d', 'photo-1517668808822-9ebb02f2a0e6', 'photo-1507413245164-6160d8298b31',
        'photo-1592323985031-15863be2f87c', 'photo-1584100936595-c0654b55a2e6', 'photo-1602810318383-e386cc2a3ccf',
        'photo-1590794056226-79ef3a8147e1', 'photo-1558317374-067fb5f30001'
    ],
    beauty: [
        'photo-1556229010-6c3f2c9ca5f8', 'photo-1586790170083-2f9ceadc732d', 'photo-1620916566398-39f1143faf36',
        'photo-1541643600914-78b084683601', 'photo-1596755094514-f87e34085b2c', 'photo-1598440947619-2c35fc9aa908',
        'photo-1522335789203-aabd1fc54bc9', 'photo-1535585209827-a15fcdbc4c2d'
    ],
    sports: [
        'photo-1592432676554-e4c76054859a', 'photo-1517836357463-d25dfeac3438', 'photo-1617083266333-5c3e670195a9',
        'photo-1553103733-4f1f0e5c9428', 'photo-1519861512547-3fbd071660bd'
    ],
    books: [
        'photo-1495446815901-a7297e633e8d', 'photo-1544819667-9abd13165534', 'photo-1614850523296-e8c041df43a8',
        'photo-1512820790803-83ca734da794', 'photo-1506880018603-83d5b814b5a6'
    ]
};

const productMeta = {
    electronics: {
        brands: ['Aura', 'Nova', 'Titan', 'Zenith', 'Echo', 'Prism'],
        types: ['Smartphone', 'Laptop', 'Headphones', 'Tablet', 'Smartwatch', 'Speaker', 'Monitor', 'Gaming Console', 'Camera', 'Drone'],
        prices: [15000, 120000]
    },
    fashion: {
        brands: ['Silken', 'Urban', 'Vogue', 'Nomad', 'Elite', 'Aura'],
        types: ['Jacket', 'Sneakers', 'Watch', 'Handbag', 'Jeans', 'T-Shirt', 'Sweater', 'Sunglasses', 'Dress', 'Belt'],
        prices: [999, 15000]
    },
    groceries: {
        brands: ['Organic', 'Pure', 'Nature', 'Gourmet', 'Farm'],
        types: ['Honey', 'Coffee', 'Olive Oil', 'Green Tea', 'Mixed Nuts', 'Oats', 'Pasta', 'Basmati Rice', 'Spices', 'Dark Chocolate'],
        prices: [150, 2500]
    },
    'home-kitchen': {
        brands: ['KitchenPro', 'HomeEase', 'Luxe', 'Modern', 'Comfort'],
        types: ['Air Fryer', 'Coffee Maker', 'Desk Lamp', 'Dinner Set', 'Cushion', 'Scented Candle', 'Cast Iron Skillet', 'Vacuum Cleaner'],
        prices: [499, 25000]
    },
    beauty: {
        brands: ['Radiance', 'Glow', 'Ethereal', 'Pure', 'Velvet'],
        types: ['Moisturizer', 'Lipstick', 'Hair Serum', 'Perfume', 'Face Mask', 'Sunscreen', 'Makeup Brushes', 'Shampoo'],
        prices: [299, 8000]
    },
    sports: {
        brands: ['Active', 'Power', 'Endurance', 'Sprint', 'Apex'],
        types: ['Yoga Mat', 'Dumbbells', 'Tennis Racket', 'Football', 'Basketball'],
        prices: [499, 15000]
    },
    books: {
        brands: ['Vintage', 'Modern', 'Classic', 'Apex', 'Global'],
        types: ['Novel', 'Journal', 'Sci-Fi Collection', 'Business Guide', 'Art Anthology'],
        prices: [199, 1999]
    }
};

const generateProducts = () => {
    const allProducts = [];
    const targetCounts = {
        electronics: 30,
        fashion: 30,
        groceries: 30,
        'home-kitchen': 20,
        beauty: 20,
        sports: 10,
        books: 10
    };

    Object.keys(targetCounts).forEach(category => {
        const count = targetCounts[category];
        const meta = productMeta[category];
        const images = imagePool[category];

        for (let i = 0; i < count; i++) {
            const brand = meta.brands[i % meta.brands.length];
            const type = meta.types[i % meta.types.length];
            const imgId = images[i % images.length];

            const price = Math.floor(Math.random() * (meta.prices[1] - meta.prices[0])) + meta.prices[0];
            const discount = (i % 5 === 0) ? (10 + Math.floor(Math.random() * 20)) : 0;

            allProducts.push({
                name: `${brand} ${type} ${i + 1}`,
                description: `Experience the excellence of the ${brand} ${type}. Crafted with premium materials and cutting-edge design, this ${type.toLowerCase()} offers unmatched performance and style for your daily lifestyle.`,
                shortDescription: `Premium ${brand} ${type} with modern features and elegant design.`,
                price: price,
                discount: discount,
                stock: 20 + Math.floor(Math.random() * 100),
                category: category,
                isFeatured: i < 3,
                imageUrl: `https://images.unsplash.com/${imgId}?w=800&q=80`,
                tags: [brand.toLowerCase(), type.toLowerCase(), category]
            });
        }
    });

    return allProducts;
};

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

        // Generate and create products
        const productsList = generateProducts();
        let count = 0;
        for (const prod of productsList) {
            const categoryId = createdCategories[prod.category];

            await Product.create({
                name: prod.name,
                description: prod.description,
                shortDescription: prod.shortDescription,
                price: prod.price,
                discount: prod.discount,
                stock: prod.stock,
                category: categoryId,
                isFeatured: prod.isFeatured,
                tags: prod.tags,
                images: [
                    {
                        url: prod.imageUrl,
                        alt: prod.name,
                        isPrimary: true,
                    },
                ],
                ratings: {
                    average: 4 + (Math.random() * 1),
                    count: Math.floor(Math.random() * 500) + 50,
                },
            });
            count++;
            if (count % 25 === 0) logger.info(`Created ${count} products...`);
        }

        // Create default admin
        await Admin.deleteMany({ email: config.admin.email });
        await Admin.create({
            email: config.admin.email,
            password: config.admin.password,
            name: 'Main Admin',
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
        logger.info('Default admin created and hashed successfully');

        // Create sample delivery partners
        await DeliveryPartner.deleteMany({});
        const samplePartners = [
            {
                telegramId: '123456789',
                name: 'Demo Partner',
                phone: '+91 9876543210',
                isActive: true,
                isOnline: true,
                isAvailable: true,
                vehicleType: 'bike',
                currentLocation: {
                    type: 'Point',
                    coordinates: [77.5946, 12.9716], // Bangalore
                },
                documents: { verified: true },
            },
            {
                telegramId: '98876532110',
                name: 'Asni',
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
        logger.info('Sample delivery partners created (Online & Available)');

        logger.info(`Seed completed successfully! Total products: ${count}`);
        process.exit(0);
    } catch (error) {
        logger.error('Seed failed:', error);
        process.exit(1);
    }
}

seed();
