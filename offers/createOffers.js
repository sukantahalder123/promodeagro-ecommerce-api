const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const OFFERS_TABLE = process.env.OFFERS_TABLE;

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}

async function calculatePrices(productData, price, savings) {
    const prices = [];

    if (productData.unit.toUpperCase() === 'KG') {
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
        const { offerName, productIds, offerPercentage } = JSON.parse(event.body);

        if (!offerName || !productIds || !offerPercentage) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: offerName, productIds, offerPercentage' }),
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

            if (!productData.Item) {
                return {
                    productId: productId,
                    message: "Product not found"
                };
            }

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
                productIds: productIds,
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
