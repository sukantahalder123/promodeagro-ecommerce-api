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

// Function to check if address exists for a user
async function checkAddressExists(userId, addressId) {
    const params = {
        TableName: 'Addresses', // Replace with your actual Addresses table name
        Key: {
            userId: userId,
            addressId: addressId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return !!data.Item;
    } catch (error) {
        console.error('Error checking address existence:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId, addressId } = JSON.parse(event.body);

    if (!userId || !addressId) {
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

        // Check if address exists for the user
        const addressExists = await checkAddressExists(userId, addressId);

        if (!addressExists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Address not found for the user" }),
            };
        }

        // Update the user's default addressId
        const updateParams = {
            TableName: process.env.USERS_TABLE, // Replace with your actual Users table name
            Key: {
                UserId: userId,
            },
            UpdateExpression: 'set defaultAddressId = :addressId',
            ExpressionAttributeValues: {
                ':addressId': addressId,
            },
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Default address updated successfully" }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
