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
        'photo-1544244015-0df4b3ffc6b0', 'photo-1519389950473-47ba0277781c', 'photo-1550009158-9ebf69173e03',
        'photo-1588872657578-7efd1f1555ed', 'photo-1591405351990-4726e331f141', 'photo-1525547718571-0390a7c74673'
    ],
    fashion: [
        'photo-1551028719-00167b16eac5', 'photo-1542291026-7eec264c27ff', 'photo-1524592094714-0f0654e20314',
        'photo-1584917865442-de89df76afd3', 'photo-1542272604-787c3835535d', 'photo-1521572163474-6864f9cf17ab',
        'photo-1434389677669-e08b4cac3105', 'photo-1511499767150-a48a237f0083', 'photo-1539008835060-4473217bdc6a',
        'photo-1624222247344-550fb8ec55ec', 'photo-1492707892479-7bc8d5a4ee93', 'photo-1483985988355-763728e1935b',
        'photo-1507680434567-5739c80be1ac', 'photo-1603344040064-a3997db83693', 'photo-1490481651871-ab68de25d43d'
    ],
    groceries: [
        'photo-1587049352846-4a222e784d38', 'photo-1495474472287-4d71bcdd2085', 'photo-1474979266404-7eaacabc8705',
        'photo-1564890369478-c89fe6cfabc4', 'photo-1536620959070-512a17e301fc', 'photo-1586439702132-55018671b996',
        'photo-1473093226795-af9932fe5856', 'photo-1586201375761-83865001e31c', 'photo-1596040033229-a9821ebd058d',
        'photo-1511381939415-e44015466834', 'photo-1542838132-92c53300491e', 'photo-1566385101042-1a000c1267c4',
        'photo-1515276481972-861d98935700', 'photo-1574484284002-952d92456975', 'photo-1589415442533-e963b6559385'
    ],
    'home-kitchen': [
        'photo-1556910103-1c02745aae4d', 'photo-1517668808822-9ebb02f2a0e6', 'photo-1507413245164-6160d8298b31',
        'photo-1592323985031-15863be2f87c', 'photo-1584100936595-c0654b55a2e6', 'photo-1602810318383-e386cc2a3ccf',
        'photo-1590794056226-79ef3a8147e1', 'photo-1558317374-067fb5f30001', 'photo-1530603956857-dbfec5038c1a',
        'photo-1520974285082-965306917646'
    ],
    beauty: [
        'photo-1556229010-6c3f2c9ca5f8', 'photo-1586790170083-2f9ceadc732d', 'photo-1620916566398-39f1143faf36',
        'photo-1541643600914-78b084683601', 'photo-1596755094514-f87e34085b2c', 'photo-1598440947619-2c35fc9aa908',
        'photo-1522335789203-aabd1fc54bc9', 'photo-1535585209827-a15fcdbc4c2d', 'photo-1512496011931-d147ca525e55',
        'photo-1599733594230-6b823276abcc'
    ],
    sports: [
        'photo-1592432676554-e4c76054859a', 'photo-1517836357463-d25dfeac3438', 'photo-1617083266333-5c3e670195a9',
        'photo-1553103733-4f1f0e5c9428', 'photo-1519861512547-3fbd071660bd', 'photo-1461896836934-ffe607ba8211',
        'photo-1517466787929-bc90951d0974', 'photo-1541534741688-6078c64b595d', 'photo-1526506118085-60ce8714f8c5',
        'photo-1461896836934-ffe607ba8211'
    ],
    books: [
        'photo-1495446815901-a7297e633e8d', 'photo-1544819667-9abd13165534', 'photo-1614850523296-e8c041df43a8',
        'photo-1512820790803-83ca734da794', 'photo-1506880018603-83d5b814b5a6', 'photo-1532012197367-6320011ad36d',
        'photo-1519681393784-d120267933ba', 'photo-1524995997946-a1c2e315a42f', 'photo-1513001900722-370f803f498d',
        'photo-1509266272358-7701da638323'
    ]
};

const productMeta = {
    electronics: {
        brands: ['Aura', 'Nova', 'Titan', 'Zenith', 'Echo', 'Prism', 'Quantum', 'Nexus', 'Volt', 'Oasis'],
        types: ['Smartphone', 'Laptop', 'Headphones', 'Tablet', 'Smartwatch', 'Speaker', 'Monitor', 'Gaming Console', 'Camera', 'Drone', 'Mouse', 'Keyboard', 'Webcam', 'Microphone', 'VR Headset'],
        prices: [15000, 120000]
    },
    fashion: {
        brands: ['Silken', 'Urban', 'Vogue', 'Nomad', 'Elite', 'Aura', 'Luxe', 'Bold', 'Thread', 'Stitch'],
        types: ['Jacket', 'Sneakers', 'Watch', 'Handbag', 'Jeans', 'T-Shirt', 'Sweater', 'Sunglasses', 'Dress', 'Belt', 'Boots', 'Scarf', 'Hat', 'Wallet', 'Suit'],
        prices: [999, 15000]
    },
    groceries: {
        brands: ['Organic', 'Pure', 'Nature', 'Gourmet', 'Farm', 'Green', 'Daily', 'Fresh', 'Vital', 'Prime'],
        types: ['Honey', 'Coffee', 'Olive Oil', 'Green Tea', 'Mixed Nuts', 'Oats', 'Pasta', 'Basmati Rice', 'Spices', 'Dark Chocolate', 'Quinoa', 'Almond Milk', 'Granola', 'Peanut Butter', 'Avocado Oil'],
        prices: [150, 2500]
    },
    'home-kitchen': {
        brands: ['KitchenPro', 'HomeEase', 'Luxe', 'Modern', 'Comfort', 'Zen'],
        types: ['Air Fryer', 'Coffee Maker', 'Desk Lamp', 'Dinner Set', 'Cushion', 'Scented Candle', 'Cast Iron Skillet', 'Vacuum Cleaner', 'Juicer', 'Toaster'],
        prices: [499, 25000]
    },
    beauty: {
        brands: ['Radiance', 'Glow', 'Ethereal', 'Pure', 'Velvet', 'Mist'],
        types: ['Moisturizer', 'Lipstick', 'Hair Serum', 'Perfume', 'Face Mask', 'Sunscreen', 'Makeup Brushes', 'Shampoo', 'Conditioner', 'Eye Cream'],
        prices: [299, 8000]
    },
    sports: {
        brands: ['Active', 'Power', 'Endurance', 'Sprint', 'Apex', 'Core'],
        types: ['Yoga Mat', 'Dumbbells', 'Tennis Racket', 'Football', 'Basketball', 'Jump Rope', 'Gym Bag', 'Water Bottle', 'Resistance Bands', 'Boxing Gloves'],
        prices: [499, 15000]
    },
    books: {
        brands: ['Vintage', 'Modern', 'Classic', 'Apex', 'Global', 'Folio'],
        types: ['Novel', 'Journal', 'Sci-Fi Collection', 'Business Guide', 'Art Anthology', 'History Book', 'Self-Help', 'Recipe Book', 'Poetry', 'Travel Guide'],
        prices: [199, 1999]
    }
};

const generateProducts = () => {
    const allProducts = [];
    const targetCounts = {
        electronics: 20,
        fashion: 20,
        groceries: 20,
        'home-kitchen': 10,
        beauty: 10,
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
            const discount = (i % 4 === 0) ? (10 + Math.floor(Math.random() * 25)) : 0;

            allProducts.push({
                name: `${brand} ${type}`,
                description: `Elevate your lifestyle with the ${brand} ${type}. This premium product is designed for those who demand quality and performance. Featuring state-of-the-art materials and a sleek aesthetic, it fits perfectly into any modern setting.`,
                shortDescription: `Premium ${brand} ${type} with cutting-edge features.`,
                price: price,
                discount: discount,
                stock: 50 + Math.floor(Math.random() * 200),
                category: category,
                isFeatured: i < 5,
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

        // Clear existing categories and products
        await Category.deleteMany({});
        await Product.deleteMany({});
        logger.info('Cleared existing categories and products');

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
                    average: 4.2 + (Math.random() * 0.7),
                    count: Math.floor(Math.random() * 1200) + 100,
                },
            });
            count++;
            if (count % 10 === 0) logger.info(`Created ${count} real products...`);
        }

        logger.info(`Seed completed successfully! Total products: ${count}`);
        process.exit(0);
    } catch (error) {
        logger.error('Seed failed:', error);
        process.exit(1);
    }
}

seed();
