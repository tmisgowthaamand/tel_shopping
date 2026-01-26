require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { Product } = require('../models');
const connectDB = require('../config/database');

const products = [
    {
        name: "Pepe Jeans Men's Regular Fit Track Pant",
        description: "Comfortable and stylish regular fit track pants from Pepe Jeans. Perfect for casual wear and lounging.",
        price: 547,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/R_NCd3icDcltDoIgAADQE_ntara1lrOY1UwrSvrjBBmShhg09VZdp9vU-_u-n1prqRaWRQV5TVLTytBYeCZTutScmKR7WqrupOSCrfrl_xbrpAoAOW1zZ5N6mO7u_ZGNdbqnzxAyoDnK1OkwxyiHjkFhKqOqHce-XaO8mC4KhF0TJYS6OCDDDbbxkMQdzF5v3wczccWNyuxRz96eYU9lDgvEJBKPS3iO3CNvEvYD2I4_lQ", isPrimary: true }],
        stock: 100,
        tags: ["pepe jeans", "trackpants", "mens fashion", "casual"]
    },
    {
        name: "Pepe Jeans Men's Mid‑Rise Track Pant",
        description: "High-quality mid-rise track pants designed for active use and durability.",
        price: 547,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/WfwLuHicDcnbEoFQFADQL0qhi8wYQ9KNk6nQW5NTuow6u84eyUf5H3_Del3fT4kIfCmKeUv7ETDPBLy10qTgmGJFJ5Q1Ii8ZQNUW6271v-WGZLpFI3PKaJgwWyNsNni-gwSswIzP-_pV-M87N4nVOG_BCQJy6fKjt02N4bzIFqGSeqN7aN0rRipoeQNzGO1UefSCepKR33eye6FHSdWUwKljNTEevem7OvAxyn4UvT1s", isPrimary: true }],
        stock: 100,
        tags: ["pepe jeans", "trackpants", "mid-rise"]
    },
    {
        name: "Pepe Jeans Men's Activewear Trackpants",
        description: "Versatile activewear trackpants for your workout sessions.",
        price: 876,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/67S0g3icDcnbEkJAAADQL4q0HjDTNCIqt9TqobesDbEXdseqr-p3-ps6r-f7aaTkwtF1TNH44hJXC1nSlVYLeZct0hAjumgY5y2tN8P6f46bVnaIIM0Ui26Jaz1MBLhZPfsLy2sl_GWRESXC0X6A61z0xN4HAc5n2AW-AciNbru8UfsJRh07JO2xTP23VcEutsQOU7zj58aYBjL3vQIRMUMA0pMVz4bveSUt1Q_jST9u", isPrimary: true }],
        stock: 100,
        tags: ["pepe jeans", "activewear", "gym"]
    },
    {
        name: "Jockey Men's Super Combed Cotton Trackpant",
        description: "Premium combed cotton trackpants for maximum comfort and breathability.",
        price: 1019,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/Q1STwnicDcntDkJQAADQJ8JoQltrYoiuNaT0p90v3Iorbuitep3eps7f8_3UQnTDSlFoi_t3JyiRBGpVuRoEFAzLmDfKUPOuY221ea7_t7JjYvk4MXi195YUloeXVhN2hwHXbeCckhsrLnkljoxm3nZKxARmF-0aU2rOcepHp3RUrWucg1I3NMD0BUEjzxuEz6RHLctCQB9lRhPNdCHss8KI-N0pJr9X3TkM7B_Cvj76", isPrimary: true }],
        stock: 100,
        tags: ["jockey", "cotton", "trackpants"]
    },
    {
        name: "Jockey 9500 Men Trackpant",
        description: "Classic Jockey 9500 series trackpants. Durable and long-lasting.",
        price: 999,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/32JTaXicDclRDoIgAADQE6FlZeLWmmU5daZUH9lPSzTQJqCQqafqOt2m3u_7fqhSQtq6XjDcDkIVOVAZm2pEqrsqsYZ5rUvKhSgZWTer_9nOIYceRmDiBmAjgsUilS6wrOHS-ZNthMbOgPsWkhsWPIZHOGcM9JVY-h2fNleDdvuh4jujHtVNRbPWaDZlUKPXNXOy8ElifCoojllC-zQkUmzPby9Iigo9TLNq8hT9AFa5Pvs", isPrimary: true }],
        stock: 100,
        tags: ["jockey", "9500", "trackpants"]
    },
    {
        name: "Campus Sutra Men's Paisley Flora Shirt",
        description: "Regular fit floral patterned casual shirt from Campus Sutra.",
        price: 569,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/static-rsc-1/zCR32gQF8RaQA-YcJWDwr-o2KnMdHlrBfAicsEGxrV8IIc-JtFlwLiuJlmufCN6f4zT-rimXyFF-GCADUHUA1C3Tuq7rS59Ss-pQxgEHS9MJbWAd5lXhrjiv9t9HDc9h8RgzW2jV_cypYrRe-kmLTn1ijl96W0ypK_0PYFMBCRWJUhZ-o0wnoNuC7PS0vIQUrRB3CZ2L-FfL88-qW_sg9xjlByPUZwevgZg8cQAzlaMnrD_aE77FnvIGpabBHKik", isPrimary: true }],
        stock: 100,
        tags: ["campus sutra", "shirt", "floral", "paisley"]
    },
    {
        name: "Campus Sutra Men's Brushed Buffalo Check Shirt",
        description: "Check-pattern casual shirt, great for everyday wear.",
        price: 569,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/15tEMnicDclLDoIwFADAEyGIooHEGFAEjVaoAoGNgHe1LaFUqL9LeR9vo7Od74cqJXtH14mA7i0VOWuqEsbg2qtSMRhA2-g9baVk4jq_zf7nuOhsB3CowSJcbEYZCwXjLOJZZa4Rbh5cW-5MHDWL1yVOwaKZ_5YFFiEaQ2nHQWzgLh9CGu6ned1to-eRl-6elo19T1atIlF2N1J53KGE-oWGPW9CYHLCT9cMbPQDOjg9mA", isPrimary: true }],
        stock: 100,
        tags: ["campus sutra", "shirt", "checkered"]
    },
    {
        name: "Campus Sutra Men's Ash Grey Pavement Shirt",
        description: "Solid casual shirt in versatile grey color.",
        price: 569,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/flN-m3icDclZCoJAGADgE6mRiAtEhOaS-5RQvQw6rriN-mfqobpPt6nv9ft-SgA6KRyXdWRcKWQpA0m3Z4sJYqgIS_qWm8qe0qorjsPhf8rJS2WDoPgihVtRd2E9EqLOum8X3iIxuEGpGNy3vAlllfhGJSJBcCEnqoB1d43KwYIYJ6n5DHhMm6TWEOO8HOqcY1Nb_HczrVHftsYDJHt307EmeiOec4m30NWAH1lYPpo", isPrimary: true }],
        stock: 100,
        tags: ["campus sutra", "shirt", "grey", "minimalist"]
    },
    {
        name: "Campus Sutra Men's Self‑Design Creased Striped Shirt",
        description: "Subtle striped pattern for daily outfits.",
        price: 569,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/eJDRQ3icDclJDoIwAADAF8mioYCJMYCyuDQGBO2JQFmKYqm2BOFXPsff6Fzn-yFCML6U5ZLi18hEWcxETlWp5iITDZZw95A56RhraL1-rv63tGBhejgUb1ykEXpXmHd7Wt0nOwWTCcs5aoe-VtBMdxF87C52T8zMPx7OxHdbDwIdxq6qApLkgmgJAqTRqLO4noOg98rI4pmqjCfmDOCGok0_9427NxiphhdxaxzDePsDA2k-MA", isPrimary: true }],
        stock: 100,
        tags: ["campus sutra", "shirt", "striped"]
    },
    {
        name: "Campus Sutra Men's Pleat‑Creased Shirt",
        description: "Pleated collar style, stylish casual look.",
        price: 569,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/HOvb0HicDcnbCoIwAADQL1JzYFMhQlsNwkuZF-olcpounJttKflV_U5_U-f1fD-tUkK6hlH35PkWqq40Vfam3kh1U5TohDNDtlwI2jfrYfU_14sqB5MjGkZxSRvN9gdQwyObuL0NZOkU_ojCeyzoM8i3WN7NM44J4DANqwPBeRqddt4-obxDMQe7bA9nXKLlnFwLDSXBY6Nxa56gk7UyYlSZ3aKwBbDgyBL6umy8H3xHPbw", isPrimary: true }],
        stock: 100,
        tags: ["campus sutra", "shirt", "pleated"]
    },
    {
        name: "Campus Sutra Men's Cube‑Textured Shirt",
        description: "Textured fabric design for a unique look.",
        price: 569,
        discount: 0,
        category: "6976f046204b7ebcf31f3629",
        images: [{ url: "https://images.openai.com/thumbnails/url/qhPgZXicDcnbCoIwAADQL_KCCqYQ4TAjNBXHCnsRN2Vecltuiv5U_9Pf1Hk930-nlJC-YbSMzLtQbaMpzCydSlWrnuiET4bsuBA9o6f38X9-kDbehRQhIPIG-pJw2zvjjgZgLrMUuRVJHiYMaVUdhhVPNBMYoaUwF1RYNbzGKe0jlG_r3Rz5vJVyB2VutVsMR9hUgLmRNgxPiQJH1rH22t2CMk4de0fCjZMfPZs-gw", isPrimary: true }],
        stock: 100,
        tags: ["campus sutra", "shirt", "textured"]
    }
];

async function seed() {
    try {
        await connectDB();
        console.log('Connected to database');
        for (const product of products) {
            const exists = await Product.findOne({ name: product.name });
            if (!exists) {
                await Product.create(product);
                console.log(`Added: ${product.name}`);
            } else {
                console.log(`Skipped (exists): ${product.name}`);
            }
        }
        console.log('Successfully completed seeding');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}

seed();
