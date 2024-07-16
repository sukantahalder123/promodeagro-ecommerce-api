const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const OFFERS_TABLE = process.env.OFFERS_TABLE;

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

    return prices;
}

exports.handler = async (event) => {
    try {
        // Extract offerId from path parameter
        const offerId = event.pathParameters.offerId;

        // Parse request body for updates
        const { productId, offerPercentage } = JSON.parse(event.body);

        // Fetch current offer details from DynamoDB
        const getParams = {
            TableName: OFFERS_TABLE,
            Key: {
                id: offerId,
            },
        };

        const offerData = await dynamoDB.get(getParams).promise();

        if (!offerData.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Offer not found' }),
            };
        }

        // Add productId to the offer's productIds list if provided
        if (productId && !offerData.Item.productIds.includes(productId)) {
            offerData.Item.productIds.push(productId);
        }

        // Update offer in DynamoDB with updated productIds list
        const updateOfferParams = {
            TableName: OFFERS_TABLE,
            Key: {
                id: offerId,
            },
            UpdateExpression: "set #productIds = :productIds",
            ExpressionAttributeNames: {
                "#productIds": "productIds",
            },
            ExpressionAttributeValues: {
                ":productIds": offerData.Item.productIds,
            },
            ReturnValues: "ALL_NEW",
        };

        await dynamoDB.update(updateOfferParams).promise();

        // Update prices for products in the offer
        const updateProductsPromises = offerData.Item.productIds.map(async (productId) => {
            // Fetch product details from DynamoDB
            const getProductParams = {
                TableName: PRODUCTS_TABLE,
                Key: {
                    id: productId,
                },
            };

            const productData = await dynamoDB.get(getProductParams).promise();

            if (!productData.Item) {
                return {
                    productId: productId,
                    message: "Product not found"
                };
            }

            // Calculate updated price and savings percentage
            const updatedSavings = (offerPercentage / 100) * productData.Item.mrp;
            const updatedPrice = productData.Item.mrp - updatedSavings;

            // Recalculate unit prices
            const updatedUnitsWithPrices = await calculatePrices(productData.Item, productData.Item.mrp, updatedSavings);

            // Update product in DynamoDB with new price, savings percentage, and unit prices
            const updateProductParams = {
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

            await dynamoDB.update(updateProductParams).promise();

            return {
                productId: productId,
                message: "Product price updated with offer discount",
            };
        });

        await Promise.all(updateProductsPromises);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Offer updated successfully', offerId }),
        };
    } catch (error) {
        console.error('Failed to update offer and product prices:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update offer and product prices', error: error.message }),
        };
    }
};
