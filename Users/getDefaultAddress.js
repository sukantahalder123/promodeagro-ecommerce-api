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
        return !!data.Item;
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
            body: JSON.stringify({ message: "Missing user ID" }),
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

        // Fetch user's default addressId
        const params = {
            TableName: process.env.USERS_TABLE, // Replace with your actual Users table name
            Key: {
                UserId: userId,
            },
            ProjectionExpression: 'defaultAddressId',
        };

        const data = await docClient.get(params).promise();

        if (!data.Item || !data.Item.defaultAddressId) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Default address not found for the user" }),
            };
        }

        // Fetch the default address details
        const addressParams = {
            TableName: 'Addresses', // Replace with your actual Addresses table name
            Key: {
                userId: userId,
                addressId: data.Item.defaultAddressId,
            },
        };

        const addressData = await docClient.get(addressParams).promise();

        if (!addressData.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Default address details not found" }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(addressData.Item),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
