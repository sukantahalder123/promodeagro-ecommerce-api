const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.verifyPaymentDetails = async (event) => {
    try {
        
        const orderId = event.orderId;
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

        // Extract payment details
        const paymentMethod = order.paymentMethod.S;
        const paymentStatus = order.paymentDetails.M.status.S;

        // Check if payment method is "cash" and payment status is "PENDING"
        if (paymentMethod.toLowerCase() === 'cash' && paymentStatus.toLowerCase() === 'pending') {
            return {
                statusCode: 200,
                body: { message: `Payment details are valid for order ${orderId}.`, orderId: orderId }
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: `Payment details are not valid for order ${orderId}.` })
            };
        }
    } catch (error) {
        console.error('Error verifying payment details:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to verify payment details', error: error.message })
        };
    }
};


// (async () => {
//     const orderId = '78273';

//     try {
//         const result = await verifyPaymentDetails(orderId);
//         console.log(result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// })();
