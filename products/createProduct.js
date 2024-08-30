
// const axios = require('axios');
// require('dotenv').config();
// const AWS = require('aws-sdk');
// const s3 = new AWS.S3();
// const dynamoDB = new AWS.DynamoDB.DocumentClient();

// const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
// const CATALOG_ID = process.env.CATALOG_ID;
// const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

// function generateUniqueId() {
//     return Math.floor(Math.random() * Date.now()).toString();
// }

// module.exports.handler = async (event) => {
//     try {
//         // Input validation
//         if (!event.body) {
//             return {
//                 statusCode: 400,
//                 body: JSON.stringify({ message: 'Missing request body' }),
//             };
//         }

//         const requiredFields = ['name', 'mrp', 'savingsPercentage', 'image', 'imageType', 'description', 'unit', 'category','subCategory', 'availability', 'brand', 'currency', 'ratings'];
//         const productData = JSON.parse(event.body);

//         for (const field of requiredFields) {
//             if (!(field in productData)) {
//                 return {
//                     statusCode: 400,
//                     body: JSON.stringify({ message: `Missing required field: ${field}` }),
//                 };
//             }
//         }

//         const tableName = 'Products';

//         const s3params = {
//             Bucket: 'ecomdmsservice',
//             Key: `${productData.name}-${generateUniqueId()}`,
//             Body: Buffer.from(productData.image, 'base64'),
//             ContentType: productData.imageType
//         };

//         const uploadResult = await s3.upload(s3params).promise();
//         const publicUrl = uploadResult.Location;

//         const savings = (productData.savingsPercentage / 100) * productData.mrp;
//         const price = productData.mrp - savings;

//         const newProduct = {
//             id: generateUniqueId(),
//             name: productData.name,
//             mrp: productData.mrp,
//             savingsPercentage: productData.savingsPercentage,
//             price: price,
//             image: publicUrl,
//             description: productData.description,
//             unit: productData.unit.toUpperCase(),
//             category: productData.category.toUpperCase(),
//             subCategory:productData.subCategory,
//             availability: productData.availability,
//             ratings: productData.ratings,
//             createdAt: new Date().toISOString(),
//             _version: 1,
//             _lastChangedAt: Date.now(),
//             _deleted: false,
//             updatedAt: new Date().toISOString(),
//         };

//         try {
//             // Convert price to an integer (e.g., cents for USD)
//             const priceInCents = Math.round(price * 100);

//             const response = await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products?access_token=${ACCESS_TOKEN}`, {
//                 retailer_id: newProduct.id,
//                 availability: productData.availability,
//                 brand: productData.brand,
//                 category: newProduct.category.toUpperCase(),
//                 description: newProduct.description,
//                 image_url: newProduct.image,
//                 name: newProduct.name,
//                 price: priceInCents,
//                 currency: productData.currency,
//                 url: newProduct.image,
//                 ratings: productData.ratings
//             });

//             const putParams = {
//                 TableName: tableName,
//                 Item: newProduct,
//             };

//             if (response.status === 200) {
//                 await dynamoDB.put(putParams).promise();
//             }

//             return {
//                 statusCode: 200,
//                 body: JSON.stringify({ message: 'Product created successfully', newProduct }),
//             };
//         } catch (error) {
//             console.error('Failed to create product in Facebook catalog:', error.response ? error.response.data : error.message);
//             return {
//                 statusCode: error.response ? error.response.status : 500,
//                 body: JSON.stringify({ message: 'Failed to create product in Facebook catalog', error: error.response ? error.response.data : error.message }),
//             };
//         }
//     } catch (error) {
//         console.error('Failed to create product:', error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ message: 'Failed to create product', error: error.message }),
//         };
//     }
// };


const axios = require('axios');
require('dotenv').config();
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
const CATALOG_ID = process.env.CATALOG_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const categoryTable = process.env.CATEGORY_TABLE

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}
async function validateCategory(category, subcategory) {
    // Check if category and subcategory exist in DynamoDB using GSI
    const params = {
        TableName: categoryTable, // Replace with your actual DynamoDB table name for categories
        IndexName: 'CategoryName-index', // Replace with your actual GSI name for CategoryName index
        KeyConditionExpression: 'CategoryName = :categoryName',
        ExpressionAttributeValues: {
            ':categoryName': category, // Use lowercase 'categoryName'
            ':subcategory': subcategory // Define subcategory here
        },
        FilterExpression: 'contains(Subcategories, :subcategory)' // Adjust FilterExpression to check if subcategory exists in Subcategories list
    };

    try {
        const data = await dynamoDB.query(params).promise();
        if (data && data.Items && data.Items.length > 0) {
            return true; // Category and subcategory exist
        } else {
            return false; // Category or subcategory not found
        }
    } catch (err) {
        console.error('Error validating category:', err);
        throw err;
    }
}
async function calculatePrices(productData, price, savings) {
    const prices = [];

    if (productData.unit.toUpperCase() === 'GRAMS') {
        const units = [250, 500, 1000]; // Units for grams
        for (const unit of units) {
            const unitPrice = Math.round((price / 1000) * unit); // Convert price per kg to price per gram
            const unitSavings = Math.round((savings / 1000) * unit); // Convert savings per kg to savings per gram
            const discountedPrice = unitPrice - unitSavings;

            prices.push({
                qty: unit,
                mrp : unitPrice,
                savings: unitSavings,
                price : discountedPrice
            });
        }
    } else {
        // If unit is 'piece', handle accordingly (e.g., no calculation needed)
        prices.push({
            qty: 1,
            price: price,
            savings: savings,
            discountedPrice: price - savings
        });
    }
    console.log(prices)
    return prices; // Return the calculated prices
}




module.exports.handler = async (event) => {
    try {
        // Input validation
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing request body' }),
            };
        }

        const requiredFields = ['name', 'mrp', 'savingsPercentage', 'about','images', 'imageType', 'description', 'unit', 'category', 'subCategory', 'availability', 'brand', 'currency', 'ratings'];
        const productData = JSON.parse(event.body);

        for (const field of requiredFields) {
            if (!(field in productData)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `Missing required field: ${field}` }),
                };
            }
        }

        const tableName = 'Products';

        const uploadPromises = productData.images.map(async (image) => {
            const s3params = {
                Bucket: 'ecomdmsservice',
                Key: `${productData.name}-${generateUniqueId()}`,
                Body: Buffer.from(image, 'base64'),
                ContentType: productData.imageType
            };

            try {
                const uploadResult = await s3.upload(s3params).promise();
                return uploadResult.Location;
            } catch (error) {
                console.error('Error uploading image to S3:', error);
                throw error;
            }
        });

        const imageUrls = await Promise.all(uploadPromises);

        const savings = (productData.savingsPercentage / 100) * productData.mrp;
        const price = productData.mrp - savings;


        console.log("PRICEE")
        const isValidCategory = await validateCategory(productData.category, productData.subCategory);
        if (!isValidCategory) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid category or subcategory' }),
            };
        }


        console.log("VALIDATE CATEGORY")

        const unitsWithPrices = await calculatePrices(productData, productData.mrp,savings);


        const newProduct = {
            id: generateUniqueId(),
            name: productData.name,
            mrp: productData.mrp,
            savingsPercentage: productData.savingsPercentage,
            price: price,
            image:imageUrls[0],
            images: imageUrls,
            unitPrices: unitsWithPrices,
            description: productData.description,
            unit: productData.unit.toUpperCase(),
            category: productData.category.toLowerCase(),
            subCategory: productData.subCategory,
            availability: productData.availability,
            brand: productData.brand,
            currency: productData.currency,
            about: productData.about,
            ratings: productData.ratings,
            createdAt: new Date().toISOString(),
            _version: 1,
            _lastChangedAt: Date.now(),
            _deleted: false,
            updatedAt: new Date().toISOString(),
        };

        try {
            // Convert price to an integer (e.g., cents for USD)
            const priceInCents = Math.round(newProduct.price * 10);
            console.log(priceInCents)

            

            const response = await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products?access_token=${ACCESS_TOKEN}`, {
                retailer_id: newProduct.id,
                availability: newProduct.availability,
                brand: newProduct.brand,
                category: newProduct.category.toLowerCase(),
                subcategory: newProduct.subCategory,
                description: newProduct.description,
                image_url: newProduct.images[0], // Assuming first image for simplicity
                name: newProduct.name,
                price: priceInCents,
                currency: newProduct.currency,
                url: newProduct.images[0], // Assuming first image URL as product URL
                ratings: newProduct.ratings,
                about: newProduct.about
            });

            const putParams = {
                TableName: tableName,
                Item: newProduct,
            };
            // console.log(response)

            if (response.status === 200) {
                await dynamoDB.put(putParams).promise();
            }

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Product created successfully', newProduct }),
            };
        } catch (error) {
            console.error('Failed to create product in Facebook catalog:', error.response ? error.response.data : error.message);
            return {
                statusCode: error.response ? error.response.status : 500,
                body: JSON.stringify({ message: 'Failed to create product in Facebook catalog', error: error.response ? error.response.data : error.message }),
            };
        }
    } catch (error) {
        console.error('Failed to create product:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create product', error: error.message }),
        };
    }
};
