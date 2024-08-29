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

async function calculatePrices(productData, flatSalePrice, offerPercentage, offerType) {
    const prices = [];

    if (offerType === 'BOGO') {
        prices.push({
            qty: 2,
            mrp: flatSalePrice,
            savings: 0,
            price: flatSalePrice,
            note: 'Buy One Get One Free'
        });
    } else if (offerType === 'flatSale') {
        if (productData.unit.toUpperCase() === 'GRAMS') {
            const units = [250, 500, 1000]; // Units for grams
            for (const unit of units) {
                const unitPrice = Math.round((flatSalePrice / 1000) * unit); // Convert flat sale price to price per unit
                prices.push({
                    qty: unit,
                    mrp: unitPrice,
                    savings: 0, // Savings is 0 for flat sale
                    price: flatSalePrice
                });
            }
        } else {
            prices.push({
                qty: 1,
                mrp: flatSalePrice,
                savings: 0, // Savings is 0 for flat sale
                price: flatSalePrice
            });
        }
    } else if (offerType === 'percentage') {
        if (productData.unit.toUpperCase() === 'GRAMS') {
            const units = [250, 500, 1000]; // Units for grams
            for (const unit of units) {
                const unitPrice = Math.round((productData.mrp / 1000) * unit); // Convert MRP to price per unit
                const percentageSavings = Math.round((offerPercentage / 100) * unitPrice); // Calculate savings based on percentage
                const discountedPrice = Math.max(unitPrice - percentageSavings, 0); // Apply percentage discount and ensure price is not negative

                prices.push({
                    qty: unit,
                    mrp: unitPrice,
                    savings: percentageSavings,
                    price: discountedPrice
                });
            }
        } else {
            const unitSavings = Math.round((offerPercentage / 100) * productData.mrp); // Percentage discount
            const discountedPrice = Math.max(productData.mrp - unitSavings, 0); // Apply percentage discount and ensure price is not negative

            prices.push({
                qty: 1,
                mrp: productData.mrp,
                savings: unitSavings,
                price: discountedPrice
            });
        }
    }

    return prices;
}

exports.handler = async (event) => {
    try {
        const { offerName, productIds, offerPercentage, offerType, flatSalePrice, base64Image } = JSON.parse(event.body);

        console.log({ offerName, productIds, offerPercentage, offerType, flatSalePrice, base64Image });

        if (!offerName || !productIds || (offerType === 'percentage' && offerPercentage === undefined) || !offerType || (offerType === 'flatSale' && flatSalePrice === undefined) || !base64Image) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields' }),
            };
        }

        const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid base64 image format' }),
            };
        }

        const contentType = matches[1];
        const base64Data = matches[2];

        const imageFileName = `${generateUniqueId()}.${contentType.split('/')[1]}`;
        const imageUrl = await uploadImageToS3(base64Data, imageFileName, contentType);

        const productsExistPromises = productIds.map(async (productId) => {
            const getParams = {
                TableName: PRODUCTS_TABLE,
                Key: { id: productId }
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

        const offerId = generateUniqueId();
        const productsPromises = productIds.map(async (productId) => {
            const getParams = {
                TableName: PRODUCTS_TABLE,
                Key: { id: productId }
            };

            const productData = await dynamoDB.get(getParams).promise();
            const product = productData.Item;

            if (!product) {
                throw new Error(`Product not found for ID: ${productId}`);
            }

            const updatedUnitsWithPrices = await calculatePrices(product, flatSalePrice, offerPercentage, offerType);

            var updateParams;

            if (product.unit === "PCS") {



                updateParams = {
                    TableName: PRODUCTS_TABLE,
                    Key: { id: productId },
                    UpdateExpression: "set #savingsPercentage = :savingsPercentage, #price = :price, #offerId = :offerId",
                    ExpressionAttributeNames: {
                        "#savingsPercentage": "savingsPercentage",
                        "#price": "price",
                        "#offerId": "offerId"
                    },
                    ExpressionAttributeValues: {
                        ":savingsPercentage": offerType === 'flatSale' ? 0 : offerPercentage,
                        ":price": offerType === 'flatSale' ? flatSalePrice : product.mrp,
                        ":offerId": offerId,
                    },
                    ReturnValues: "ALL_NEW",
                };

            } else {
                updateParams = {
                    TableName: PRODUCTS_TABLE,
                    Key: { id: productId },
                    UpdateExpression: "set #savingsPercentage = :savingsPercentage, #price = :price, #unitPrices = :unitPrices, #offerId = :offerId",
                    ExpressionAttributeNames: {
                        "#savingsPercentage": "savingsPercentage",
                        "#price": "price",
                        "#unitPrices": "unitPrices",
                        "#offerId": "offerId"
                    },
                    ExpressionAttributeValues: {
                        ":savingsPercentage": offerType === 'flatSale' ? 0 : offerPercentage,
                        ":price": offerType === 'flatSale' ? flatSalePrice : product.mrp,
                        ":unitPrices": updatedUnitsWithPrices,
                        ":offerId": offerId,
                    },
                    ReturnValues: "ALL_NEW",
                };
            }

            await dynamoDB.update(updateParams).promise();

            return { productId: productId, message: "Product updated with discount" };
        });

        await Promise.all(productsPromises);

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
