require('dotenv').config();
const connectDB = require('../config/database');
const { Category, Product } = require('../models');
const logger = require('../utils/logger');

const booksToSeed = [
    {
        name: "Story Books For Kids | Set Of 10",
        description: "A collection of 10 beautifully illustrated story books for kids. Includes classics and modern tales to inspire young minds.",
        price: 499,
        discount: 50,
        category: "books",
        imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
        stock: 100,
        tags: ["kids", "stories", "education", "books"]
    },
    {
        name: "Biographies For Kids | Set Of 5",
        description: "Inspiring life stories of great world leaders and inventors, written specifically for children aged 6-12.",
        price: 899,
        discount: 30,
        category: "books",
        imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80",
        stock: 50,
        tags: ["biography", "history", "education", "books"]
    },
    {
        name: "The Art of Programming",
        description: "A deep dive into software engineering principles and best practices for modern developers.",
        price: 1200,
        discount: 15,
        category: "books",
        imageUrl: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&q=80",
        stock: 30,
        tags: ["programming", "tech", "education", "books"]
    }
];

async function seedBooks() {
    try {
        await connectDB();
        logger.info('Connected to database for book seeding');

        // Find or create category
        let booksCategory = await Category.findOne({ slug: 'books' });
        if (!booksCategory) {
            booksCategory = await Category.create({
                name: 'Books',
                slug: 'books',
                icon: '📚',
                description: 'Educational, fiction, and non-fiction books'
            });
            logger.info('Created Books category');
        }

        for (const book of booksToSeed) {
            const existing = await Product.findOne({ name: book.name });
            if (!existing) {
                await Product.create({
                    ...book,
                    category: booksCategory._id,
                    images: [{ url: book.imageUrl, alt: book.name, isPrimary: true }],
                    ratings: {
                        average: 4.5,
                        count: Math.floor(Math.random() * 50) + 10
                    }
                });
                logger.info(`Added book: ${book.name}`);
            }
        }

        logger.info('Book seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('Book seeding failed:', error);
        process.exit(1);
    }
}

seedBooks();
