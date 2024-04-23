const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION,
    endpoint: process.env.ENDPOINT
});

module.exports.handler = async (event) => {
    try {
        // Extract the order ID from the path parameters
        const OrderId = event.pathParameters.OrderId;

        // Define the params for the GetItem operation
        const params = {
            TableName: 'Order-hxojpgz675cmbad5uyoeynwh54-dev',
            Key: {
                'OrderId': { S: OrderId }
            }
        };

        // Perform the GetItem operation to retrieve the item by ID
        const { Item } = await dynamoDB.send(new GetItemCommand(params));

        // Check if the item exists
        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Order not found' }),
            };
        }

        // Return the order
        return {
            statusCode: 200,
            body: JSON.stringify({ order: Item }),
        };
    } catch (error) {
        console.error('Error getting order by ID:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get order by ID', error: error.message }),
        };
    }
};
