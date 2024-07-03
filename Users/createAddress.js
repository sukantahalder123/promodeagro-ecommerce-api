const AWS = require('aws-sdk');
const crypto = require('crypto');
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
        return !!data.Item;
    } catch (error) {
        console.error('Error checking user existence:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId, address } = JSON.parse(event.body);

    if (!userId || !address) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
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

        const addressId = crypto.randomUUID();
        const params = {
            TableName: 'Addresses',
            Item: {
                userId: userId,  // Ensure consistent casing for attribute names
                addressId: addressId,  // Ensure consistent casing for attribute names
                ...address,
            },
        };

        await docClient.put(params).promise();
        return {
            statusCode: 201,
            body: JSON.stringify({ addressId }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
