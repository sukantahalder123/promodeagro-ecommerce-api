const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.ORDER_TABLE;

module.exports.handler = async (event) => {
    try {
        const { orderId, newStatus } = JSON.parse(event.body);

        // Validate new status
        const validStatuses = [
            "Order placed",
            "In Process",
            "Packed",
            "On the way",
            "Delivered"
        ];

        if (!validStatuses.includes(newStatus)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid status provided' }),
            };
        }

        const updateParams = {
            TableName: tableName,
            Key: {
                id: orderId
            },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': newStatus
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await docClient.send(new UpdateCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order status updated successfully', updatedOrder: result.Attributes }),
        };
    } catch (error) {
        console.error('Error updating order status:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update order status', error: error.message }),
        };
    }
};
