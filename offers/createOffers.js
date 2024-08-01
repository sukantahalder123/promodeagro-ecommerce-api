const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const S3 = new AWS.S3();
require('dotenv').config();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const OFFERS_TABLE = process.env.OFFERS_TABLE;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_FOLDER_PATH = process.env.S3_FOLDER_PATH || '';

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}

async function uploadImageToS3(base64Image, fileName, contentType) {
    try {
        const buffer = Buffer.from(base64Image, 'base64');
        const params = {
            Bucket: S3_BUCKET_NAME,
            Key: `${S3_FOLDER_PATH}${fileName}`, // Use folder path
            Body: buffer,
            ContentEncoding: 'base64',
            ContentType: contentType
        };

        await S3.upload(params).promise();
        return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${S3_FOLDER_PATH}${fileName}`;
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw error;
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
                mrp: unitPrice,
                savings: unitSavings,
                price: discountedPrice
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

    return prices; // Serialize prices array to JSON string
}

exports.handler = async (event) => {
    try {
        // Input validation
        const { offerName, productIds, offerPercentage, offerType, base64Image } = JSON.parse(event.body);

        if (!offerName || !productIds || !offerPercentage || !offerType || !base64Image) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: offerName, productIds, offerPercentage, offerType, base64Image' }),
            };
        }

        // Determine content type from base64 string
        const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid base64 image format' }),
            };
        }

        const contentType = matches[1];
        const base64Data = matches[2];

        // Upload image to S3
        const imageFileName = `${generateUniqueId()}.${contentType.split('/')[1]}`;
        const imageUrl = await uploadImageToS3(base64Data, imageFileName, contentType);

        // Check if all products exist
        const productsExistPromises = productIds.map(async (productId) => {
            const getParams = {
                TableName: PRODUCTS_TABLE,
                Key: {
                    id: productId,
                },
            };
            const productData = await dynamoDB.get(getParams).promise();
            return productData.Item ? true : false;
        });

        const productsExist = await Promise.all(productsExistPromises);
        if (productsExist.includes(false)) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'One or more products not found' }),
            };
        }

        const productsPromises = productIds.map(async (productId) => {
            // Fetch the product by ID
            const getParams = {
                TableName: PRODUCTS_TABLE,
                Key: {
                    id: productId,
                },
            };

            const productData = await dynamoDB.get(getParams).promise();

            // Apply discount
            const updatedSavings = (offerPercentage / 100) * productData.Item.mrp;
            const updatedPrice = productData.Item.mrp - updatedSavings;

            // Recalculate unit prices
            const updatedUnitsWithPrices = await calculatePrices(productData.Item, productData.Item.mrp, updatedSavings);

            // Update product with discount details
            const updateParams = {
                TableName: PRODUCTS_TABLE,
                Key: {
                    id: productId,
                },
                UpdateExpression: "set #savingsPercentage = :savingsPercentage, #price = :price, #unitPrices = :unitPrices",
                ExpressionAttributeNames: {
                    "#savingsPercentage": "savingsPercentage",
                    "#price": "price",
                    "#unitPrices": "unitPrices",
                },
                ExpressionAttributeValues: {
                    ":savingsPercentage": offerPercentage,
                    ":price": updatedPrice,
                    ":unitPrices": updatedUnitsWithPrices,
                },
                ReturnValues: "ALL_NEW",
            };

            await dynamoDB.update(updateParams).promise();

            return {
                productId: productId,
                message: "Product updated with discount",
            };
        });

        await Promise.all(productsPromises);

        // Create offer entry
        const offerId = generateUniqueId();
        const putParams = {
            TableName: OFFERS_TABLE,
            Item: {
                id: offerId,
                offerName: offerName,
                offerPercentage: offerPercentage,
                offerType: offerType,
                productIds: productIds,
                imageUrl: imageUrl,
                createdAt: new Date().toISOString(),
            },
        };

        await dynamoDB.put(putParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Offer created successfully', offerId }),
        };
    } catch (error) {
        console.error('Failed to create offer and update products with discounts:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create offer and update products with discounts', error: error.message }),
        };
    }
};
