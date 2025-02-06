const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const TABLE_NAME = process.env.SESSION_TABLE;

exports.handler = async (event) => {

    const { userId, sessionToken } = JSON.parse(event.body);
    console.log(userId)

    // Generate a new session token
    const createdAt = Date.now();
    const expiresAt = createdAt + 24 * 60 * 60 * 1000; // Session expiry in 24 hours

    const params = {
        TableName: TABLE_NAME,
        Item: {
            UserId: userId,
            sessionToken,
            createdAt,
            expiresAt,
        },
    };

    try {
        await dynamoDB.put(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ sessionToken, expiresAt }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error saving session', error }),
        };
    }
};
