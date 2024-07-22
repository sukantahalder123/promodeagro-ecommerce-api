const AWS = require('aws-sdk');
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
        return data.Item;
    } catch (error) {
        console.error('Error checking user existence:', error);
        throw error;
    }
}

// Function to check if address exists for the user
async function checkAddressExists(userId, addressId) {
    const params = {
        TableName: process.env.ADDRESS_TABLE,
        Key: {
            userId: userId,
            addressId: addressId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error checking address existence:', error);
        throw error;
    }
}

// Function to get all addresses for a user
async function getAllAddresses(userId) {
    const params = {
        TableName: process.env.ADDRESS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        return data.Items;
    } catch (error) {
        console.error('Error fetching user addresses:', error);
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
        const user = await checkUserExists(userId);

        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        // Check if address exists for the user
        const address = await checkAddressExists(userId, addressId);

        if (!address) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Address not found for the user" }),
            };
        }

        // Check if the address is the default address
        if (user.defaultAddressId === addressId) {
            // Get all addresses for the user
            const addresses = await getAllAddresses(userId);

            // Find another address to set as default
            const newDefaultAddress = addresses.find(addr => addr.addressId !== addressId);

            if (newDefaultAddress) {
                // Update the user's default addressId
                const updateParams = {
                    TableName: process.env.USERS_TABLE,
                    Key: {
                        UserId: userId,
                    },
                    UpdateExpression: 'set defaultAddressId = :newDefaultAddressId',
                    ExpressionAttributeValues: {
                        ':newDefaultAddressId': newDefaultAddress.addressId,
                    },
                    ReturnValues: 'UPDATED_NEW',
                };

                await docClient.update(updateParams).promise();
            } else {
                // No other addresses found, clear the defaultAddressId
                const updateParams = {
                    TableName: process.env.USERS_TABLE,
                    Key: {
                        UserId: userId,
                    },
                    UpdateExpression: 'remove defaultAddressId',
                    ReturnValues: 'UPDATED_NEW',
                };

                await docClient.update(updateParams).promise();
            }
        }

        // Delete the address
        const deleteParams = {
            TableName: process.env.ADDRESS_TABLE,
            Key: {
                userId: userId,
                addressId: addressId,
            },
        };

        await docClient.delete(deleteParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Address deleted successfully" }),
        };
    } catch (error) {
        console.error('Error deleting address:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
