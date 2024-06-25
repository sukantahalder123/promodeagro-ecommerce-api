const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.updateInventoryItem = async (event) => {
    try {
        // Get the id from the path parameters
        const { id } = event.pathParameters;
        
        // Parse the request body for availableQuantity and unit
        const { availableQuantity, unit } = JSON.parse(event.body);

        // Validate input
        if (!id || !availableQuantity || typeof availableQuantity !== 'number' || !unit) {
            throw new Error('Invalid input. "id", "availableQuantity", and "unit" are required and "quantity" must be a number.');
        }

        // Check if the inventory item exists
        const getItemParams = {
            TableName: 'Inventory',
            Key: {
                id: { S: id }
            }
        };

        const existingItem = await dynamoDB.send(new GetItemCommand(getItemParams));

        if (!existingItem.Item) {
            throw new Error('Inventory item not found.');
        }

        // Update the quantity and unit of the existing item
        const updateParams = {
            TableName: 'Inventory',
            Key: {
                id: { S: id }
            },
            UpdateExpression: 'SET #q = :availableQuantity, #u = :unit',
            ExpressionAttributeNames: {
                '#q': 'availableQuantity',
                '#u': 'unit'
            },
            ExpressionAttributeValues: {
                ':availableQuantity': { N: availableQuantity.toString() },
                ':unit': { S: unit }
            }
        };

        await dynamoDB.send(new UpdateItemCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Inventory item updated successfully' }),
        };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update inventory item', error: error.message }),
        };
    }
};
