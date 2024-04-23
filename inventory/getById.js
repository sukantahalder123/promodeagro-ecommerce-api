const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.getInventoryById = async (event) => {
    try {
        // Get the inventory ID from the path parameters
        const inId = event.pathParameters.id;

        // Define the GetItemCommand to get the item by ID
        const command = new GetItemCommand({
            TableName: 'Inventory-hxojpgz675cmbad5uyoeynwh54-dev',
            Key: { id: { S: inId } }
        });

        // Perform the GetItemCommand to get the inventory item
        const data = await dynamoDB.send(command);

        // Check if the item exists
        if (!data.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Inventory item not found' }),
            };
        }

        // Unmarshall the item to convert DynamoDB format to JSON
        const item = unmarshall(data.Item);

        // Return the inventory item
        return {
            statusCode: 200,
            body: JSON.stringify(item),
        };
    } catch (error) {
        console.error('Error getting inventory item:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get inventory item', error: error.message }),
        };
    }
};
