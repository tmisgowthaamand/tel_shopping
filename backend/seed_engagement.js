require('dotenv').config();
const connectDB = require('./src/config/database');
const { Category, Product, Admin, DeliveryPartner, User, Order } = require('./src/models');
const logger = require('./src/utils/logger');

async function seedEngagement() {
    try {
        await connectDB();
        console.log('Seeding engagement data (Users & Orders)...');

        // Create mock users
        const users = [
            { telegramId: '111111', firstName: 'John', lastName: 'Doe', username: 'johndoe', phone: '+919999999999' },
            { telegramId: '222222', firstName: 'Jane', lastName: 'Smith', username: 'janesmith', phone: '+918888888888' },
            { telegramId: '333333', firstName: 'Alex', lastName: 'Johnson', username: 'alexj', phone: '+917777777777' }
        ];

        const createdUsers = [];
        for (const u of users) {
            let user = await User.findOne({ telegramId: u.telegramId });
            if (!user) {
                user = await User.create(u);
                console.log(`Created user: ${u.firstName}`);
            }
            createdUsers.push(user);
        }

        // Get some products for orders
        const products = await Product.find().limit(5);
        if (products.length === 0) {
            console.log('No products found. Run product seed first.');
            process.exit(1);
        }

        // Create mock orders
        const statuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
        for (let i = 0; i < 10; i++) {
            const user = createdUsers[i % createdUsers.length];
            const product = products[i % products.length];
            const price = product.price;
            const finalPrice = product.price; // assuming no discount for mock

            await Order.create({
                user: user._id,
                items: [{
                    product: product._id,
                    productName: product.name,
                    productImage: product.images[0]?.url,
                    quantity: 1,
                    price: price,
                    discount: 0,
                    finalPrice: finalPrice,
                    total: finalPrice
                }],
                subtotal: finalPrice,
                discount: 0,
                deliveryFee: 50,
                total: finalPrice + 50,
                paymentStatus: i % 2 === 0 ? 'completed' : 'pending',
                paymentMethod: i % 2 === 0 ? 'razorpay' : 'cod',
                status: statuses[i % statuses.length],
                deliveryAddress: {
                    address: '123 Test St, Bangalore',
                    location: {
                        type: 'Point',
                        coordinates: [77.5946, 12.9716]
                    }
                }
            });
            console.log(`Created order for ${user.firstName}`);
        }

        console.log('Engagement seed completed!');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seedEngagement();
