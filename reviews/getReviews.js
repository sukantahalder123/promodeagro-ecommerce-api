const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const REVIEWS_TABLE = process.env.REVIEWS_TABLE;

exports.handler = async (event) => {
    try {
        const productId = event.pathParameters.productId;

        const queryParams = {
            TableName: REVIEWS_TABLE,
            IndexName: 'productId-index', // Ensure you have a GSI on productId
            KeyConditionExpression: 'productId = :productId',
            ExpressionAttributeValues: {
                ':productId': productId,
            },
        };

        const result = await dynamoDB.query(queryParams).promise();
        const reviews = result.Items;

        if (reviews.length === 0) {
            // Default response when no reviews are found
            return {
                statusCode: 200,
                body: JSON.stringify({
                    reviews: [],
                    ratingDistribution: [
                    ],
                    averageRating: "",
                    statusCode: 200
                }),
            };
        }

        // Calculate the distribution of ratings
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;

        reviews.forEach(review => {
            const rating = parseInt(review.rating, 10);
            ratingCounts[rating]++;
            totalRating += rating;
        });

        const totalReviews = reviews.length;
        const ratingDistribution = Object.keys(ratingCounts).map(rating => ({
            rating: parseInt(rating),
            percentage: ((ratingCounts[rating] / totalReviews) * 100).toFixed(2)
        }));

        // Calculate the overall average rating
        const averageRating = (totalRating / totalReviews).toFixed(2);

        return {
            statusCode: 200,
            body: JSON.stringify({
                reviews: reviews,
                ratingDistribution: ratingDistribution,
                averageRating: averageRating,
                statusCode: 200
            }),
        };
    } catch (error) {
        console.error('Failed to fetch reviews:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch reviews', error: error.message }),
        };
    }
};
