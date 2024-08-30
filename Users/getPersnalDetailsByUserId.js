const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const userId = event.queryStringParameters && event.queryStringParameters.userId;

    // Check for missing userId
    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required field: userId", statusCode: 400 }),
        };
    }

    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { UserId: userId },
    };

    try {
        const data = await docClient.get(params).promise();

        if (!data.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found", statusCode: 404 }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ user: data.Item, statusCode: 200 }),
        };
    } catch (error) {
        console.error('Error retrieving user details:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message, statusCode: 500 }),
        };
    }
};
