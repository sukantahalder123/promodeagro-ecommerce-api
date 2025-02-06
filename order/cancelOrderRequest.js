const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
require("dotenv").config();

const client = new DynamoDBClient({ region: "ap-south-1" });

module.exports.handler = async (event) => {
    try {
        const { orderId } = JSON.parse(event.body);

        // Validate inputs
        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: "Order ID is required.",
                }),
            };
        }

        // Check if the order exists in the database
        const getOrderParams = {
            TableName: process.env.ORDER_TABLE,
            Key: {
                id: { S: orderId },
            },
        };

        const getOrderResponse = await client.send(new GetItemCommand(getOrderParams));

        // If the order doesn't exist, return an error
        if (!getOrderResponse.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: "Order not found.",
                }),
            };
        }

        // Update the order status to "Request for Cancellation"
        const updateOrderParams = {
            TableName: process.env.ORDER_TABLE,
            Key: {
                id: { S: orderId },
            },
            UpdateExpression: "SET #status = :status",
            ExpressionAttributeNames: {
                "#status": "status", // Map reserved keyword 'status'
            },
            ExpressionAttributeValues: {
                ":status": { S: "Request for Cancellation" },
            },
        };

        await client.send(new UpdateItemCommand(updateOrderParams));

        // Success response
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: "Order status has been updated to 'Request for Cancellation'.",
                orderId,
            }),
        };
    } catch (error) {
        console.error("Error updating order status:", error);

        // Error response
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: "Internal server error",
            }),
        };
    }
};
