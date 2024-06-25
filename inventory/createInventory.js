const { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const productId = body.productId;
        const availableQuantity = body.availableQuantity;
        const unit = body.unit;

        // Validate input
        if (!productId || !availableQuantity || typeof availableQuantity !== 'number' || !unit || typeof unit !== 'string' || unit.trim() === '') {
            throw new Error('Invalid input. "productId" and "availableQuantity" are required and "availableQuantity" must be a number. "unit" must be a non-empty string.');
        }

        // Check if productId exists in the product table
        const getProductParams = {
            TableName: 'Products',
            Key: { id: { S: productId } }
        };

        const productData = await dynamoDB.send(new GetItemCommand(getProductParams));

        // If productId does not exist in the product table, return an error
        if (!productData.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Product not found' }),
            };
        }

        // Check if productId already exists in the inventory table
        const getInventoryParams = {
            TableName: 'Inventory',
            FilterExpression: 'productId = :productId',
            ExpressionAttributeValues: { ':productId': { S: productId } }
        };
        const inventoryData = await dynamoDB.send(new ScanCommand(getInventoryParams));

        // If inventoryData.Items is undefined or empty, continue without error
        if (!inventoryData.Items || inventoryData.Items.length === 0) {
            // Generate a unique ID for the inventory item
            const id = generateInventoryId();

            // Save inventory item to DynamoDB
            const putParams = {
                TableName: 'Inventory',
                Item: marshall({
                    id: id,
                    productId: productId,
                    availableQuantity: availableQuantity.toString(), // convert to string
                    unit: unit,
                    createdAt: new Date().toISOString(),
                    _version: 1,
                    _lastChangedAt: Date.now(),
                    _deleted: false,
                    updatedAt: new Date().toISOString(),
                }),
                // ConditionExpression to check if productId doesn't already exist in the Inventory table
                ConditionExpression: 'attribute_not_exists(productId)'
            };

            await dynamoDB.send(new PutItemCommand(putParams));

            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Item added in Inventory successfully' }),
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Product already exists in inventory' }),
            };
        }
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to process request', error: error.message }),
        };
    }
};

const generateInventoryId = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
};
