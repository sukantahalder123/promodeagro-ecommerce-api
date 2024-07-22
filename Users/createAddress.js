const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

// Function to check if user exists
async function checkUserExists(userId) {
    const params = {
        TableName: process.env.USERS_TABLE,
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

// Function to get user details
async function getUserDetails(userId) {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: {
            UserId: userId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error retrieving user details:', error);
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

        // Get user details
        const user = await getUserDetails(userId);

        const addressId = crypto.randomUUID();

        // Create the new address
        const addressParams = {
            TableName: 'Addresses',
            Item: {
                userId: userId,
                addressId: addressId,
                ...address,
            },
        };

        await docClient.put(addressParams).promise();

        // If no default address exists, set the new address as the default
        if (!user.defaultAddressId) {
            const updateParams = {
                TableName: process.env.USERS_TABLE,
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
        }

        return {
            statusCode: 201,
            body: JSON.stringify({ addressId }),
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
