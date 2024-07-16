const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const REVIEWS_TABLE = process.env.REVIEWS_TABLE;
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}

async function updateProductRating(productId) {
    const queryParams = {
        TableName: REVIEWS_TABLE,
        IndexName: 'productId-index',
        KeyConditionExpression: 'productId = :productId',
        ExpressionAttributeValues: {
            ':productId': productId,
        },
    };

    const result = await dynamoDB.query(queryParams).promise();
    const reviews = result.Items;

    if (reviews.length === 0) {
        return 0;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const updateParams = {
        TableName: PRODUCTS_TABLE,
        Key: { id: productId },
        UpdateExpression: 'set averageRating = :averageRating, reviewCount = :reviewCount',
        ExpressionAttributeValues: {
            ':averageRating': averageRating,
            ':reviewCount': reviews.length,
        },
        ReturnValues: 'ALL_NEW',
    };

    await dynamoDB.update(updateParams).promise();
    return averageRating;
}

exports.handler = async (event) => {
    try {
        const { productId, userId, rating, review } = JSON.parse(event.body);

        if (!productId || !userId || rating == null || rating < 1 || rating > 5 || !review) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing or invalid fields: productId, userId, rating (1-5), review' }),
            };
        }

        // Check if product exists
        const getProductParams = {
            TableName: PRODUCTS_TABLE,
            Key: { id: productId },
        };
        const productResult = await dynamoDB.get(getProductParams).promise();
        if (!productResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Product not found' }),
            };
        }

        // Check if user exists and get the username
        const getUserParams = {
            TableName: USERS_TABLE,
            Key: { UserId: userId },
        };
        const userResult = await dynamoDB.get(getUserParams).promise();
        if (!userResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'User not found' }),
            };
        }

        const username = userResult.Item.Name;

        const reviewId = generateUniqueId();
        const timestamp = new Date().toISOString();

        const putParams = {
            TableName: REVIEWS_TABLE,
            Item: {
                reviewId,
                productId,
                userId,
                username, // Store the username in the review item
                rating,
                review,
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        };

        await dynamoDB.put(putParams).promise();

        const averageRating = await updateProductRating(productId);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Review added successfully', reviewId, averageRating }),
        };
    } catch (error) {
        console.error('Failed to add review:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to add review', error: error.message }),
        };
    }
};
