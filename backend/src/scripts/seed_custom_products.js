require('dotenv').config();
const connectDB = require('../config/database');
const { Category, Product } = require('../models');
const logger = require('../utils/logger');

const productsToSeed = [
    {
        name: "Halonix 10W White LED Bulb B22",
        description: "Energy-efficient 10W LED bulb providing bright white light, perfect for home and office use. B22 base holder compatible.",
        price: 199,
        discount: 79,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/loK463icDcndCoIwGADQJ0rTrFCImCNHPypaYXUT-WmaY5u2ufKlep_eps7t-X5qpVrpmWbJ4Tm0qixGKucTo5Lqph5ggGCmrEXbPni17Bb_81BUuASSAlUAeDNDR4vvglWOi7A_ZJVdz_s5po1OXjJsouma-Jd3v4W9uMVJyihuepehQyrk6twMLNNXkln2oJ0uyKP7lbka-34KhIBTOgjFU2rpEL3omIsTzX4v4D4q",
        stock: 500,
        tags: ["led", "bulb", "halonix", "lighting"]
    },
    {
        name: "Desidiya Universe Crystal Ball Night Light",
        description: "Beautiful universe-themed crystal ball night light with a wooden base. Creates a magical atmosphere in any room.",
        price: 999,
        discount: 82,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/MVfetHicDcnbCoIwAADQLyqdiWEQUZjOssJpYE_S5mVpu7StrD6q_-lv6rye74caI_XMsmpO1EuauhoZzO1xq83ZXMiYCGZpKqS88HZxm_9vttxXfkRSqrK-P7lO-cgcUl2fKgmbgE1HAMb5xpM00wdvnzDEUF_Y8TK5NzhFBUAFozALIEddKYTZ4LQbKHwU_iDXQT5Ruy6OtLCxk6uhdUUIGrBt8JH7K7u-v380_T5U",
        stock: 150,
        tags: ["night light", "crystal ball", "decor", "gift"]
    },
    {
        name: "Desidiya LED Rice Light",
        description: "Premium gold string LED lights, ideal for festivals, weddings, and home decoration.",
        price: 999,
        discount: 94,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/P6i5ZnicDcndCoIwGADQJ1L7UcwgIjYtzYmGJHojc_5MqTnzM6mn6nV6mzq35_vhAHLcalol2OMloSoVKMRKbUag0DKV9Xdt5L2UrWj2w-5_20NQWkcWW_fQKEiKn8jgmReL3JxpE8KFp1e8Rv1MiY0mnxkuubBoCImCpi70E-xIf7FJBiOy8unk6dQkrTe_Ax3fusqtgQr9vGD4ShUeZUmNHs_xZQK1uyWYTnA-_AB0Tj3v",
        stock: 1000,
        tags: ["lights", "decoration", "festive", "led"]
    },
    {
        name: "Zebronics Zeb‑Bro Wired Earphones",
        description: "High-quality wired earphones with a built-in microphone and 3.5mm audio jack.",
        price: 399,
        discount: 65,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/oTTnhXicDcnbEkJAAADQL9o0iTDTNC5Rk1EoqZedrB2rCxtrF1_V7_Q3dV7P90MYo60hSbhCzUAZzgHLKnlStOzGSjRB9UtqSU1pWRWr9_J_hhnkuoeOWOc4OdzD7bBYa57Fbe3qiyDNu8uYIM30oNw56nq2uTbT1r_Elg2UuIrSgeGaEdN9mB2iyDNu8uYIM30oNw56nq2uTbT1r_Elg2UuIrSgeGaEdN9mB2UuIrSgeGaEdN9mB2",
        stock: 300,
        tags: ["earphones", "zebronics", "audio", "wired"]
    },
    {
        name: "Zebronics Zeb‑Jaguar Wireless Mouse",
        description: "Ergonomic 2.4GHz wireless mouse with USB receiver. Precise tracking.",
        price: 1190,
        discount: 75,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/p2w82XicDclJDoIwAADAF7FIEVISY0QQMaQsJaBejJZVWSo0UnmV3_E3Otf5firG6GhIUt6R4U1Zngns1iliObIrq4lI-lYaq57SuivXz9X_jA3KoENiqLupvMNKgD3YDIfG51ZiM0yX5E5AmIU-4MtTHfHE1KBLSitiLeSVLpgI2WoM5mj_vpQgh4vXVkeBq2EweDbqi0luAHyYqTqBRg_Pxwsmc8KRE_ZakQ7TDxr6PQg",
        stock: 250,
        tags: ["mouse", "wireless", "zebronics", "accessory"]
    },
    {
        name: "Havells 9W Smart Bulb",
        description: "Wi-Fi enabled smart LED bulb compatible with Alexa and Google Home.",
        price: 1999,
        discount: 84,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/lp0OpnicDclZCoJAAADQE7nhiChEaFqES6a59SM6LiPiNo7rqbpOt6n3-74fRMgwyQxTdBDvAylyimQdS1cTSUkNadi3zIT6Yai76jye_icrdi7doLtoCmcd72ewLqyh8irrU72VJi9LJQbeKDPmGxCbzlZOkd9isQ5bc3t4IArz3XYq99jJnMIwiZDo6WgOYs3QRwweqHbF960pd5Ah1gGcsEoJL4iJf5WgNfbrD6iHPuw",
        stock: 200,
        tags: ["smart", "bulb", "havells", "iot"]
    },
    {
        name: "Longway Kwid Dry Iron",
        description: "Non-stick Teflon coated dry iron for effortless ironing.",
        price: 879,
        discount: 58,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/am0q_3icDcnbCoIwAADQL_KWIpsQMUMtErMrzJeR06a2eWkTs4_qf_qbOq_n-6mU6qVnGGVLn3OvykJTeWvqTKqbqqlOO2HIquv7umWrYfk_DyUFjOgZ8NAla7qG0hVshlwNILOOTkneuENsbGDMaQVMNFlwFyxeDgqT_Q1Oh7qRrv_weYa6SGAwAotneBYota5ju7mEBNsyjqStToFD0pwIKO_OlgXbRhvvP_EuPTo",
        stock: 200,
        tags: ["iron", "home", "appliance", "longway"]
    },
    {
        name: "Kenstar Estella Electric Kettle",
        description: "Fast-boiling 1350W electric kettle with a 1.6L capacity.",
        price: 1495,
        discount: 70,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/8rFYTHicDcndCoIwGADQJ_InknRChEqkaWaomd5EflszzGluTHud3qq3qXN7vp9GiIHbmkYYjO9BEKyImukq5eImHqBC32m86Yfhwejmtf6f7cQY7SB70up4P-V6iRgGq40Dr85hieh5pRhF6RM6J95xb6WYT2SLHLzY11ez6LIHiimBw0SEQUQfa5ZIBSx__wA0tT2N",
        stock: 100,
        tags: ["kettle", "kitchen", "appliance", "kenstar"]
    },
    {
        name: "Pigeon Amaze Plus Electric Kettle",
        description: "Durable 1.5L electric kettle from Pigeon.",
        price: 1245,
        discount: 56,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/vRa_unicDclJDoIwAADAFwkChi0xhrJFFIJA1HAh0rIUQ6m0gvgQ_-ZvdK7z_bScU2aKYkXguFBeoRUviSw0jN84hgIcepG1A6WYNLvH9n-mFSHDh6lhubOTd440e9HBPYGzlgzhW30Su60yvs_8foO8gB2ZrSjqBGY2FijOarDge9qFwRoFk-5qsX59yWoeQeDUiVR3PbbApSh_f2E1GQ",
        stock: 150,
        tags: ["pigeon", "kettle", "kitchen", "appliance"]
    },
    {
        name: "boAt BassHeads 100 Earphones",
        description: "Iconic Hawk-inspired wired earphones from boAt.",
        price: 999,
        discount: 62,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/E8oGDHicDclJDoIwFADQEymDhikxhghlEBRxAjcEWwSjlEJ_wnAo7-Nt9G3f91MBMG4IQkFxNzIoyAzuVJ6XHHJ44jluaoFXDWNPWq7b1f8Mc0d0B8fRGSgPS3TMEn1kSZ7B9KoTghby4ObpQ8kiOvnbXtptgplqYcRtk0y80FCKQ4KqXhNVO3Q6dgokU6K-3I9dc8zujofBvbxNxdreygNcvd6tlnV3EuN2Lw4_UWA-NQ",
        stock: 500,
        tags: ["boat", "earphones", "audio", "wired"]
    },
    {
        name: "Lifelong LLMG300 Mixer Grinder",
        description: "High-performance 500W mixer grinder with 3 stainless steel jars.",
        price: 4000,
        discount: 73,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/N_84KHicDcndDoIgGADQJyotHI221lRaZau0H53euEBLChHlq-Zb9Tq9TZ3b8_1UANpMLatUvOs1lMUAmBoNbwYuIPiQN7VlqkZroW7zdva_qbsryJIfgtOqHftxbhO8Od5FSvuo9NznueKioJKScDNudrbxnZXNuN7SHg0CHxmc8aijLxNgmdD6HL9aidKUH-2J9LSLHLzY11ez6LIHiimBw0SEQUQfa5ZIBSx__wA0tT2N",
        stock: 80,
        tags: ["mixer", "grinder", "lifelong", "kitchen"]
    },
    {
        name: "Lifelong LLMG202 Mixer Grinder",
        description: "500W Mixer Grinder with 2 Jars for Wet & Dry grinding.",
        price: 3000,
        discount: 65,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/N_84KHicDcndDoIgGADQJyotHI221lRaZau0H53euEBLChHlq-Zb9Tq9TZ3b8_1UANpMLatUvOs1lMUAmBoNbwYuIPiQN7VlqkZroW7zdva_qbsryJIfgtOqHftxbhO8Od5FSvuo9NznueKioJKScDNudrbxnZXNuN7SHg0CHxmc8aijLxNgmdD6HL9aidKUH-2J9LSLHLzY11ez6LIHiimBw0SEQUQfa5ZIBSx__wA0tT2N",
        stock: 50,
        tags: ["mixer", "lifelong", "grinder"]
    },
    {
        name: "Longway Super Pro Juicer Mixer Grinder",
        description: "Juicer Mixer Grinder with 4 Jars for various tasks.",
        price: 3899,
        discount: 64,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/opdE5XicDclJDoIwAADAF7FEFoHEGIiAMSgqi8CFlJalSAtIhfAp_-NvdK7z_TSMDZMhCCWFr3VgJeJYQSW-nhhgGPKwJ8LU9MOAab0fd_8zzAvSXXhzqrsmPiiwe-hm3XGZV0dM6yx21chD4SmpuoRraRUBS81R8lasxXd8UCXPoChsX8GN2trmqDC5NgmZQ931l4WILDgXGMSTvMXxmIreuMmkAMBrlpMDyrUfMm0-Iw",
        stock: 75,
        tags: ["longway", "mixer", "juicer"]
    },
    {
        name: "Voltas Beko Mixer Grinder",
        description: "A Tata product featuring Grindx technology for superior grinding.",
        price: 4490,
        discount: 67,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/yqb1PHicDcltCoIwAADQE5m6LDCIKAqdaWRmmn9EN11p7sONRE_VdbpNvb_v-3koxeVK1yuK-pGrCmuqpMaMSFWoJ5oh1unywTh_UrIR6_-ttidsOygMABsTXASm5d8sr9tfDDSB9OhG5FCJV1pl5mXaCR6S4l2_G2ZzFy1yFmY2pbmG5bKP7xYIziLmbQMjrZZjB0g3ePPML9tMCBDlR-cavuYJ6akPoZvCOtaGH7uhP0I",
        stock: 60,
        tags: ["voltas", "tata", "mixer", "grinder"]
    },
    {
        name: "Cadlec JarGenie 4 Jar Mixer Grinder",
        description: "750W Mixer Grinder | Juicer | Blender | ABS Body.",
        price: 3499,
        discount: 63,
        category: "electronics",
        imageUrl: "https://images.openai.com/thumbnails/url/WRGjBXicDc1JDoIwFADQE1UGUZDEGCKDyKCgUePGSIFSCFD9JSCn8jreRtZv8X7fgnMGuiBkDX5_GM9SxJNGnhHgT07xDLe1AEXLGG3I5rWeTDfCdOXgc6_l7hAden3Yb5lQcRsW1I6c0n7ejKfsLtz7Jxbak1VyuGUC-s5QOdap3N7VlWqppYF96iViD51U-TO_1iAJOIMJBWFaPkCUEOa4hAopruPSHURp7jX4Mk_wBlao-4Q",
        stock: 90,
        tags: ["cadlec", "jargenie", "mixer"]
    }
];

async function seedCustomProducts() {
    try {
        await connectDB();
        logger.info('Connected to database for specific custom product seeding');

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
            // Check if product already exists by name
            const existing = await Product.findOne({ name: prod.name });
            if (existing) {
                // Update existing product with new image URL and other details
                existing.images = [{ url: prod.imageUrl, alt: prod.name, isPrimary: true }];
                existing.price = prod.price;
                existing.discount = prod.discount;
                existing.description = prod.description;
                existing.tags = prod.tags;
                existing.category = electronicsCategory._id;
                await existing.save();
                logger.info(`Updated product: ${prod.name}`);
            } else {
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
            }
        }

        logger.info('Custom product seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('Custom seeding failed:', error);
        process.exit(1);
    }
}

seedCustomProducts();
