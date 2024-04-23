const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

// Create DynamoDB client
const dynamoDB = new DynamoDBClient({
    region: process.env.REGION,
    endpoint: process.env.ENDPOINT
});

// Function to process payment
exports.processPayment = async (event) => {
    try {
        // Retrieve order details from event payload
        const orderDetails = JSON.parse(event.Payload);
        
        // Determine payment method
        const paymentMethod = orderDetails.paymentMethod;

        // Perform payment processing logic here...

        // Once payment is processed, update the order status based on payment method
        let status;
        if (paymentMethod === 'CASH') {
            status = 'PAID_CASH';
        } else if (paymentMethod === 'UPI') {
            status = 'PAID_UPI';
        } else {
            throw new Error('Invalid payment method');
        }

        // Update the order status in DynamoDB
        const params = {
            TableName: process.env.ORDER_TABLE_NAME,
            Item: {
                id: { S: orderDetails.id },
                status: { S: status }
            }
        };
        await dynamoDB.send(new PutItemCommand(params));

        // Return success response
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Payment processed successfully' })
        };
    } catch (error) {
        console.error('Error processing payment:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to process payment', error: error.message })
        };
    }
};
