const crypto = require('crypto');
require('dotenv').config();
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');


exports.handler = async (event) => {
    try {
        // Extract headers and body
        console.log(event)
        const headers = event.headers;
        const body = JSON.parse(event.body);


        // Extract PhonePe Authorization header
        const receivedAuthHeader = headers['Authorization'] || headers['authorization'];

        // Your configured username & password (store securely in AWS Secrets Manager or Environment Variables)
        const USERNAME = process.env.PHONEPE_USERNAME;
        const PASSWORD = process.env.PHONEPE_PASSWORD;

        // Compute SHA256(username:password)
        const expectedAuthHash = crypto.createHash('sha256').update(`${USERNAME}:${PASSWORD}`).digest('hex');

        // Verify the Authorization header
        if (receivedAuthHeader !== expectedAuthHash) {
            console.error("Invalid Authorization Header");
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized" }),
            };
        }

        // Process webhook event
        console.log("Webhook Received:", JSON.stringify(body, null, 2));

        const { event: eventType, payload } = body;

        if (!eventType || !payload) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid payload" }),
            };
        }

        // Handle different event types
        switch (eventType) {
            case "pg.order.completed":
                console.log("Order Completed:", payload);
                const up = await updatePaymentStatus('401-3536333', 'Paid');
                console.log(up)
                console.log("commpleted status update")
                break;
            case "pg.order.failed":
                console.log("Order Failed:", payload);
                // Handle failed order
                break;
            case "pg.refund.accepted":
            case "pg.refund.completed":
                console.log("Refund Processed:", payload);
                // Update refund status
                break;
            case "pg.refund.failed":
                console.log("Refund Failed:", payload);
                // Handle refund failure
                break;
            default:
                console.warn("Unhandled event type:", eventType);
                break;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Webhook processed successfully" }),
        };
    } catch (error) {
        console.error("Error processing webhook:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};


async function updatePaymentStatus(orderId, paymentStatus) {
    const updateParams = {
        TableName: process.env.ORDER_TABLE,
        Key: {
            id: { S: orderId }, // No need to use marshall for keys
        },
        UpdateExpression: 'SET paymentStatus = :paymentStatus',
        ExpressionAttributeValues: {
            ':paymentStatus': { S: paymentStatus },
        }
    };

    console.log("Update Params:", updateParams);

    try {
        const update = await dynamoDB.send(new UpdateItemCommand(updateParams));
        console.log("Update Response:", update);
        console.log("Payment status updated successfully");
    } catch (error) {
        console.error("Error updating payment status:", error);
        throw new Error("Failed to update payment status");
    }
}
