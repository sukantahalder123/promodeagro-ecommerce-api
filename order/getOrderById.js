// getOrderById.js

const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

// Create DynamoDB client
const dynamoDB = new DynamoDBClient({
    region: process.env.REGION,
    endpoint: process.env.ENDPOINT
});

const tableName = process.env.ORDER_TABLE;

// Handler function to get an order by ID
module.exports.handler = async (event) => {
    try {
        // Extract orderId from path parameters
        const orderId = event.pathParameters.id;

        // Prepare parameters for GetItemCommand
        const getParams = {
            TableName: tableName,
            Key: {
                id: { S: orderId } // Assuming orderId is a string
            }
        };

        // Retrieve order item from DynamoDB
        const { Item } = await dynamoDB.send(new GetItemCommand(getParams));

        // Check if order exists
        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Order not found' }),
            };
        }

        // Unmarshall the order item
        const order = unmarshall(Item);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order retrieved successfully', order }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to process request', error: error.message }),
        };
    }
};
