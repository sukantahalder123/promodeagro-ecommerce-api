const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

// Create DynamoDB client
const dynamoDB = new DynamoDBClient({
});

// Handler function to retrieve all orders
exports.handler = async () => {
    try {
        // Scan the DynamoDB table to retrieve all orders
        const scanParams = {
            TableName: process.env.ORDER_TABLE_NAME // Access table name from environment variable
        };
        const data = await dynamoDB.send(new ScanCommand(scanParams));

        // Process the response data
        const orders = data.Items.map(item => {
            const order = {};
            // Iterate over each attribute of the item
            for (const key in item) {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    // Check if the attribute is "items"
                    if (key === 'items') {
                        // If it's "items", preserve the structure
                        order[key] = item[key].L.map(item => {
                            const innerItem = {};
                            // Extract the inner structure
                            for (const innerKey in item.M) {
                                if (Object.prototype.hasOwnProperty.call(item.M, innerKey)) {
                                    innerItem[innerKey] = item.M[innerKey].S || item.M[innerKey].N || item.M[innerKey].M || item.M[innerKey].L;
                                }
                            }
                            return innerItem;
                        });
                    } else {
                        // For other attributes, remove the outer structure
                        order[key] = item[key].S || item[key].N || item[key].M || item[key].L;
                    }
                }
            }
            return order;
        });

        // Return the list of orders
        return {
            statusCode: 200,
            body: JSON.stringify(orders)
        };
    } catch (error) {
        console.error('Error retrieving orders:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve orders', error: error.message })
        };
    }
};
