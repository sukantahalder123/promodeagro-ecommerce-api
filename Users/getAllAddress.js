const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

// Function to check if user exists
async function checkUserExists(userId) {
    const params = {
        TableName: process.env.USERS_TABLE, // Replace with your actual Users table name
        Key: {
            UserId: userId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return !!data.Item; // Returns true if user exists, false otherwise
    } catch (error) {
        console.error('Error checking user existence:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const userId = event.pathParameters.userId;

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing userId in path parameters" }),
        };
    }

    try {
        // Check if user exists
        const userExists = await checkUserExists(userId);

        if (!userExists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const params = {
            TableName: process.env.ADDRESS_TABLE,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        const data = await docClient.query(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ addresses: data.Items }),
        };
    } catch (error) {
        console.error('Error querying addresses:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
