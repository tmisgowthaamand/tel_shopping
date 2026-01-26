require('dotenv').config();
const connectDB = require('../config/database');
const { Category, Product } = require('../models');
const logger = require('../utils/logger');

const productsToSeed = [
    // Image 0 - Lighting & Audio
    {
        name: "Halonix 10W White Led Bulb | B22 Base Holder",
        description: "Energy-efficient 10W LED bulb providing bright white light, perfect for home and office use. B22 base holder compatible.",
        price: 199,
        discount: 79, // Resulting Price: ₹41
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1550985543-f47f38aee62e?w=800&q=80",
        stock: 500,
        tags: ["led", "bulb", "halonix", "lighting"]
    },
    {
        name: "Desidiya Universe Crystal Ball Night Light",
        description: "Beautiful universe-themed crystal ball night light with a wooden base. Creates a magical atmosphere in any room.",
        price: 999,
        discount: 82, // Resulting Price: ₹179
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=800&q=80",
        stock: 150,
        tags: ["night light", "crystal ball", "decor", "gift"]
    },
    {
        name: "DesiDiya String LED Rice Light | Gold",
        description: "Premium gold string LED lights, ideal for festivals, weddings, and home decoration.",
        price: 999,
        discount: 94, // Resulting Price: ₹59
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
        stock: 1000,
        tags: ["lights", "decoration", "festive", "led"]
    },
    {
        name: "Zebronics Bro in Ear Wired Earphones with Mic",
        description: "High-quality wired earphones with a built-in microphone and 3.5mm audio jack.",
        price: 399,
        discount: 65, // Resulting Price: ₹139
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
        stock: 300,
        tags: ["earphones", "zebronics", "audio", "wired"]
    },
    {
        name: "Zebronics Zeb-Jaguar Wireless Mouse",
        description: "Ergonomic 2.4GHz wireless mouse with USB receiver. Precise tracking.",
        price: 1190,
        discount: 75, // Resulting Price: ₹299
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
        stock: 250,
        tags: ["mouse", "wireless", "zebronics", "accessory"]
    },
    {
        name: "Havells 9W V Smart Bulb",
        description: "Wi-Fi enabled smart LED bulb compatible with Alexa and Google Home.",
        price: 1999,
        discount: 84, // Resulting Price: ₹319
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1550985543-f47f38aee62e?w=800&q=80",
        stock: 200,
        tags: ["smart", "bulb", "havells", "iot"]
    },
    // Image 1 - Appliances & boAt
    {
        name: "Kenstar Estella Electric Kettle | 1.6 L",
        description: "Fast-boiling 1350W electric kettle with a 1.6L capacity.",
        price: 1495,
        discount: 70, // Resulting Price: ₹449
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80",
        stock: 100,
        tags: ["kettle", "kitchen", "appliance", "kenstar"]
    },
    {
        name: "Longway Kwid Light Weight Dry Iron",
        description: "Non-stick Teflon coated dry iron for effortless ironing.",
        price: 879,
        discount: 58, // Resulting Price: ₹369
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1498192254166-86180bb719c0?w=800&q=80",
        stock: 200,
        tags: ["iron", "home", "appliance", "longway"]
    },
    {
        name: "Pigeon by Stovekraft Amaze Plus Electric Kettle",
        description: "Durable 1.5L electric kettle from Pigeon.",
        price: 1245,
        discount: 56, // Resulting Price: ₹549
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80",
        stock: 150,
        tags: ["pigeon", "kettle", "kitchen", "appliance"]
    },
    {
        name: "boAt BassHeads 100 Wired Earphones",
        description: "Iconic Hawk-inspired wired earphones from boAt.",
        price: 999,
        discount: 62, // Resulting Price: ₹379
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80",
        stock: 500,
        tags: ["boat", "earphones", "audio", "wired"]
    },
    // Image 2 - Mixers
    {
        name: "Lifelong LLMG300 Power Pro LX Mixer Grinder",
        description: "High-performance 500W mixer grinder with 3 stainless steel jars.",
        price: 4000,
        discount: 73, // Resulting Price: ₹1099
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=800&q=80",
        stock: 80,
        tags: ["mixer", "grinder", "lifelong", "kitchen"]
    },
    {
        name: "Lifelong LLMG202 Mixer Grinder",
        description: "500W Mixer Grinder with 2 Jars for Wet & Dry grinding.",
        price: 3000,
        discount: 65, // Resulting Price: ₹1049
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=800&q=80",
        stock: 50,
        tags: ["mixer", "lifelong", "grinder"]
    },
    {
        name: "Longway Super Dlx 750 Watt Juicer Mixer Grinder",
        description: "Juicer Mixer Grinder with 4 Jars for various tasks.",
        price: 3899,
        discount: 64, // Resulting Price: ₹1399
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=800&q=80",
        stock: 75,
        tags: ["longway", "mixer", "juicer"]
    },
    {
        name: "Voltas Beko Mixer Grinder With Grindx",
        description: "A Tata product featuring Grindx technology for superior grinding.",
        price: 4490,
        discount: 67, // Resulting Price: ₹1499
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=800&q=80",
        stock: 60,
        tags: ["voltas", "tata", "mixer", "grinder"]
    },
    {
        name: "Cadlec JarGenie 4 Jar 750W Mixer Grinder",
        description: "750W Mixer Grinder | Juicer | Blender | ABS Body.",
        price: 3499,
        discount: 63, // Resulting Price: ₹1299
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=800&q=80",
        stock: 90,
        tags: ["cadlec", "jargenie", "mixer"]
    },
    {
        name: "Longway Sag... Mixer Grinder",
        description: "Durable mixer grinder with 2 Jars for everyday use.",
        price: 2600,
        discount: 62, // Resulting Price: ₹999
        category: "electronics",
        imageUrl: "https://images.unsplash.com/photo-1585238341267-1cfec2046a55?w=800&q=80",
        stock: 120,
        tags: ["longway", "mixer"]
    }
];

async function seedZeptoProducts() {
    try {
        await connectDB();
        logger.info('Connected to database for specific Zepto product seeding');

        // Find or create category
        let electronicsCategory = await Category.findOne({ slug: 'electronics' });
        if (!electronicsCategory) {
            electronicsCategory = await Category.create({
                name: 'Electronics',
                slug: 'electronics',
                icon: '📱',
                description: 'Premium gadgets, smartphones, and professional hardware'
            });
            logger.info('Created Electronics category');
        }

        for (const prod of productsToSeed) {
            // Check if product already exists to avoid duplicates
            const existing = await Product.findOne({ name: prod.name });
            if (!existing) {
                await Product.create({
                    ...prod,
                    category: electronicsCategory._id,
                    images: [{ url: prod.imageUrl, alt: prod.name, isPrimary: true }],
                    ratings: {
                        average: 4.0 + (Math.random() * 1),
                        count: Math.floor(Math.random() * 1000) + 100
                    }
                });
                logger.info(`Added product: ${prod.name}`);
            } else {
                logger.info(`Product already exists, skipping: ${prod.name}`);
            }
        }

        logger.info('Zepto product seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('Zepto seeding failed:', error);
        process.exit(1);
    }
}

seedZeptoProducts();
