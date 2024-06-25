
const { DynamoDBClient, UpdateItemCommand, ScanCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.updateInventoryItems = async (event) => {
    try {
        const { orderId } = event;

        if (!orderId) {
            throw new Error('Invalid input. "orderId" is required.');
        }

        // Fetch order details from DynamoDB
        const getOrderParams = {
            TableName: 'Orders',
            Key: { id: { S: orderId } }
        };

        const getOrderResult = await dynamoDB.send(new GetItemCommand(getOrderParams));

        if (!getOrderResult.Item) {
            throw new Error(`Order with ID ${orderId} not found.`);
        }

        const order = getOrderResult.Item;

        // Extract products from items in the order
        const products = order.items.L.map(item => ({
            productId: item.M.productId.S,
            quantity: parseInt(item.M.quantity.N)
        }));

        // Create a map of productId to inventory items
        const inventoryMap = new Map();

        // Scan the entire inventory table to get all items
        const scanParams = {
            TableName: 'Inventory'
        };

        const scanResult = await dynamoDB.send(new ScanCommand(scanParams));

        for (const item of scanResult.Items) {
            inventoryMap.set(item.productId.S, item);
        }

        const updatePromises = [];

        for (const product of products) {
            const { productId, quantity } = product;

            if (!productId || quantity === undefined || typeof quantity !== 'number') {
                throw new Error('Invalid input for product. "productId" and "quantity" are required and "quantity" must be a number.');
            }

            // Check if the inventory item exists in the scanned results
            const existingItem = inventoryMap.get(productId);

            if (!existingItem) {
                throw new Error(`Inventory item with Product ID ${productId} not found.`);
            }

            // Log the existing item for debugging
            console.log('Existing Item:', JSON.stringify(existingItem, null, 2));

            // Parse current quantity correctly
            const availableQuantityValue = existingItem.availableQuantity.N !== undefined ? existingItem.availableQuantity.N : existingItem.availableQuantity.S;
            const currentQuantity = parseInt(availableQuantityValue);
            if (isNaN(currentQuantity)) {
                throw new Error(`Invalid current quantity for Product ID ${productId}.`);
            }

            // Calculate updated quantity
            const updatedQuantity = currentQuantity - quantity;

            // Check for invalid updated quantity
            if (isNaN(updatedQuantity)) {
                throw new Error(`Invalid updated quantity for Product ID ${productId}.`);
            }

            // Update the quantity of the existing inventory item
            const updateParams = {
                TableName: 'Inventory',
                Key: {
                    id: { S: existingItem.id.S }
                },
                UpdateExpression: 'SET #q = :updatedQuantity',
                ExpressionAttributeNames: {
                    '#q': 'availableQuantity'
                },
                ExpressionAttributeValues: {
                    ':updatedQuantity': { N: updatedQuantity.toString() }
                }
            };

            // Push the promise for the update into the array
            updatePromises.push(dynamoDB.send(new UpdateItemCommand(updateParams)));
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        return {
            statusCode: 200,
            body: { message: 'Inventory updated successfully', orderId: orderId },
        };
    } catch (error) {
        console.error('Error updating inventory:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update inventory', error: error.message }),
        };
    }
};



// (async () => {
//     const event = {
//         body: JSON.stringify({
//             orderId:"69283"
//         })
//     };

//     try {
//         const result = await updateInventoryItems(event);
//         console.log(result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// })();

