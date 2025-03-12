const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const { DynamoDBClient, GetItemCommand, QueryCommand, PutItemCommand, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');

require('dotenv').config();
const addressTableName = process.env.ADDRESS_TABLE; // Add the address table name
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");

const dynamoDB = new DynamoDBClient({
    // Add any specific configurations here
});

// Function to check if the user exists in the Users table
async function getUserDetails(userId) {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: {
            UserId: userId, // Assuming 'UserId' is the primary key for the Users table
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error fetching user details:', error);
        throw error;
    }
}

// Function to get address details
async function getAddressDetails(userId, addressId) {
    if (!addressId) return null; // If addressId is not provided, return null

    const getAddressParams = {
        TableName: addressTableName,
        Key: marshall({
            userId: userId,
            addressId: addressId
        }) // Ensure this matches your table's key schema
    };

    try {
        const { Item: addressItem } = await dynamoDB.send(new GetItemCommand(getAddressParams));
        return addressItem ? unmarshall(addressItem) : null;
    } catch (error) {
        console.error('Error fetching address:', error);
        return null; // Return null in case of error
    }
}

exports.handler = async (event) => {
    const { addressId, userId } = event.queryStringParameters;

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing userId in path parameters" }),
        };
    }

    try {
        // Check if the user exists
        const user = await getUserDetails(userId);

        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const params = {
            TableName: process.env.CART_TABLE,
            KeyConditionExpression: 'UserId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        const data = await docClient.query(params).promise();

        // Calculate subtotal and savings
        let subTotal = 0;
        let totalSavings = 0;

        data.Items.forEach(item => {
            subTotal += item.Subtotal || 0;
            totalSavings += item.Savings || 0;
        });

        const addressDetails = await getAddressDetails(userId, addressId);
        console.log(addressDetails);

        let deliveryCharges = subTotal > 300 ? 0 : 50; // Default delivery charge

        if (addressDetails && addressDetails.zipCode) {
            const freeDeliveryZipCodes = ['500086', '500091', '500030'];

            if (freeDeliveryZipCodes.includes(addressDetails.zipCode)) {
                console.log("true");
                console.log(subTotal);
                deliveryCharges = subTotal > 100 ? 0 : 20;
            } else {
                console.log(subTotal);
                deliveryCharges = subTotal > 300 ? 0 : 50;
            }
        }

        // Calculate final total
        const finalTotal = subTotal + deliveryCharges;

        return {
            statusCode: 200,
            body: JSON.stringify({
                items: data.Items,
                subTotal: subTotal.toFixed(2),
                savings: totalSavings.toFixed(2),
                deliveryCharges,
                finalTotal: finalTotal.toFixed(2)
            }),
        };
    } catch (error) {
        console.error('Error fetching cart details:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
