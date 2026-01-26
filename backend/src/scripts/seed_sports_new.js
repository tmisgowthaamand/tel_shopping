require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { Product } = require('../models');
const connectDB = require('../config/database');

const sportsProducts = [
    {
        name: "Lifelong 75cm Gym Ball",
        description: "Anti-burst fitness ball for exercise, core workouts & stretching. Durable and slip-resistant material.",
        price: 689,
        discount: 0,
        category: "6976f046204b7ebcf31f3631",
        images: [{ url: "https://images.openai.com/thumbnails/url/gkFpfXicDcnrDkJQAADgJ3JpVLK1phFGrjsmf5r7JY7DOYin6nV6m_r-ft9PRQjCIsPkMB1XRPKMIgnk6BKTmNQpnfYdg6seoRqWl-H8P1GyspOaeqUhCAXrF3K7sSswbX7ZasqZbQ0G0E8AvOnBgBUVqN1hlSUTNpE7Svyk84_jJDWtEURv186Dtn5pHHBzw9Idc9J8Y9ejeLJC8pyH4SpjnQ_RnvMywLUbvCvLD7HXPyw", isPrimary: true }],
        stock: 50,
        tags: ["gym", "ball", "fitness", "lifelong", "workout"],
        sizes: ["75cm"]
    },
    {
        name: "Kidsmate Hover Football Indoor Soccer Toy",
        description: "Indoor hover soccer football with LED lights & soft bumper. Safe for furniture and walls.",
        price: 449,
        discount: 0,
        category: "6976f046204b7ebcf31f3631",
        images: [{ url: "https://images.openai.com/thumbnails/url/2XKyM3icDclJDoIwAADAF7EcBIHEmKrgFksFRDwR2pKKQMtSRXiU__E3Otf5fu5SNr2jaTkn3djInCoSc11lvcxkQVQiaq2_i6YpOFu2i_85AFJ7S0I4lkbkrVqXPgk9pyzaoAlh-PBPSf5yEW-j8mIe3pnnbSdiKyK8AY7jac-ryoRH_6UHqBTcslNXr7oQ65xSgAHb1MYALBhMuznwxRwpA7ODKL4O3nqdzH5WmT3W", isPrimary: true }],
        stock: 100,
        tags: ["toy", "soccer", "hover", "kids", "indoor"],
        sizes: ["Standard"]
    },
    {
        name: "Nivia Country Color Molded Football",
        description: "Nivia molded football with rubber build for casual play. High durability for versatile surfaces.",
        price: 222,
        discount: 0,
        category: "6976f046204b7ebcf31f3631",
        images: [{ url: "https://images.openai.com/thumbnails/url/VhNrD3icDclJDoIwAADAF1VABCyJMbiGEEABQU4GSim1LFWasDzK__gbnet8P5UQvDclCbfoPXGBCyDyVl6QXmSCogXqGqmvOs5pS7avzf9MyyvgGUV5Ng0u5YDUOysk9QqC1Hv5J0cL1jNev1Xo5qWFQYeXeaAmAYeJR9mzuh1HZb6LTEGVzpzoQoxBHgDVrqyBZfNI9rUXu-Lp3_WRPWxkxFFasPQQkmXPbfkHErk90Q", isPrimary: true }],
        stock: 80,
        tags: ["nivia", "football", "soccer", "rubber"],
        sizes: ["Standard"]
    },
    {
        name: "Starter Club Football Starter L3 Size 5",
        description: "Full-size football, beginner/starter ball. High quality material for training.",
        price: 615,
        discount: 0,
        category: "6976f046204b7ebcf31f3631",
        images: [{ url: "https://images.openai.com/thumbnails/url/U8bowHicDcnbEkJAAADQL1oGUxszTaOI3JJCelvrsjJZ2ZXqc_qr_qbO6_l-COc900Sx7PDw6nlZAJ53slAzjniDBUxvIiO075uuXt2X_9P0oFAtHFHDyEyJuDt3kOOZY9YShznB7KqUE690ANMME0Ta2i4TZLuRojrtVLmnbJAs77HZhnvUdKN3AkoI_VEFz8S-APyOUzZnh8XRD3LKQHBewx8eKzjf", isPrimary: true }],
        stock: 60,
        tags: ["football", "size 5", "starter", "training"],
        sizes: ["Size 5"]
    },
    {
        name: "Visko Freestyle Skipping Rope",
        description: "Adjustable freestyle skipping rope in Blue, Black, and Green. Perfect for gym and cardio workouts.",
        price: 181,
        discount: 0,
        category: "6976f046204b7ebcf31f3631",
        images: [{ url: "https://images.openai.com/thumbnails/url/Ejsp4HicDclJDoIwAADAFwGKqEhiTBstCggxoEEuBkrZhLK0aOir_I6_0bnO91Nw3jFDUQjFw9Rxkko8oaqcMx7zEsu4bRRWtF1X0nzXb_9nADfdmPgyNSMJ5jS0D-KC3iIgmZ84M-r6MGKW9M7KJU8cUAnU6PtBNOliGmBmPU7cQr52E9X9GDLvrnmhbQMra722XyS4QODlTvqaSOk1Qk9YnsVY1yaFtab6UbxcgR8FDD9l", isPrimary: true }],
        stock: 200,
        tags: ["skipping rope", "gym", "cardio", "visko"],
        sizes: ["One Size"]
    },
    {
        name: "Cosco Light Cricket Tennis Balls (Pack of 3)",
        description: "Lightweight cricket tennis balls (3 pcs) for training & fun play. High visibility and bounce.",
        price: 233,
        discount: 0,
        category: "6976f046204b7ebcf31f3631",
        images: [{ url: "https://images.openai.com/thumbnails/url/idDiq3icDcndEkJAGADQJ_I3bYWZpik_pQlLNOnGsAyStfiieqjep7epc3u-nxKADaog5JT0LwZ5xkFKRb4YIIGK8KRthKFsGatose5W_1M3TqbsiBfFdMKDGHfkqodbhJkWuVsom3fgO6ifJhk0gsPC8E3j6nnjvm7vb59DVIENdxyPFQlyVLtQLdK7LAdJlC0xDqXzTa_tACtIiv25DY96NsaHy9Oa5JM5s5ofRxQ90Q", isPrimary: true }],
        stock: 150,
        tags: ["cosco", "cricket", "tennis ball", "training"],
        sizes: ["Pack of 3"]
    }
];

async function seed() {
    try {
        await connectDB();
        console.log('Connected to database');
        for (const product of sportsProducts) {
            const exists = await Product.findOne({ name: product.name });
            if (!exists) {
                await Product.create(product);
                console.log(`Added: ${product.name}`);
            } else {
                console.log(`Skipped (exists): ${product.name}`);
            }
        }
        console.log('Successfully added products to Sports category');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding sports products:', error);
        process.exit(1);
    }
}

seed();
