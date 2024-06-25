const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

// Create DynamoDB client
const dynamoDB = new DynamoDBClient({

});

const tableName = process.env.ORDER_TABLE;

// Handler function to delete an order by ID
module.exports.handler = async (event) => {

        console.log(tableName)
    try {
        // Extract orderId from path parameters
        const orderId = event.pathParameters.id;

        // Prepare parameters for DeleteItemCommand
        const deleteParams = {
            TableName: tableName,
            Key: {
                id: { S: orderId } // Assuming orderId is a string
            }
        };

        // Delete the order item from DynamoDB
        await dynamoDB.send(new DeleteItemCommand(deleteParams));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order deleted successfully' }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to process request', error: error.message }),
        };
    }
};