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
    const { userId, addressId, address } = JSON.parse(event.body);

    if (!userId || !addressId || !address) {
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

        // Build the UpdateExpression dynamically based on the provided fields in 'address'
        let updateExpression = 'set ';
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.keys(address).forEach((key, index) => {
            const attrName = `#attr${index}`;
            const attrValue = `:val${index}`;
            updateExpression += `${attrName} = ${attrValue}, `;
            expressionAttributeNames[attrName] = key;
            expressionAttributeValues[attrValue] = address[key];
        });

        // Remove the trailing comma and space from the UpdateExpression
        updateExpression = updateExpression.slice(0, -2);

        const params = {
            TableName: process.env.ADDRESS_TABLE,
            Key: {
                userId: userId,
                addressId: addressId,
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.update(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Address updated successfully" }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
