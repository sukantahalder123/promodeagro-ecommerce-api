const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const OFFERS_TABLE = process.env.OFFERS_TABLE;
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;

exports.handler = async (event) => {
    try {
        // Extract offerId from path parameter
        const offerId = event.pathParameters.offerId;

        // Fetch offer details from DynamoDB
        const getOfferParams = {
            TableName: OFFERS_TABLE,
            Key: {
                id: offerId,
            },
        };

        const offerData = await dynamoDB.get(getOfferParams).promise();

        if (!offerData.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Offer not found' }),
            };
        }

        // Fetch products associated with the offer
        const productIds = offerData.Item.productIds;

        if (!productIds || productIds.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'No products found for the offer', offerId }),
            };
        }

        // Fetch details of each product
        const getProductPromises = productIds.map(async (productId) => {
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
                    message: 'Product not found',
                };
            }

            return productData.Item;
        });

        const products = await Promise.all(getProductPromises);

        return {
            statusCode: 200,
            body: JSON.stringify(products),
        };
    } catch (error) {
        console.error('Failed to fetch products for offer:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch products for offer', error: error.message }),
        };
    }
};
