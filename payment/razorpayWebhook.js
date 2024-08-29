const axios = require('axios');
const crypto = require('crypto');
const { DynamoDBClient, UpdateItemCommand,GetItemCommand} = require('@aws-sdk/client-dynamodb');
const { marshall , unmarshall} = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

// Initialize DynamoDB client
const dynamoDB = new DynamoDBClient();

module.exports.handler = async (event) => {
    try {

        console.log(event)
        const secret = '12345678'; // Your Razorpay secret
        const requestBody = JSON.parse(event.body);

        console.log(requestBody);

        // Compute the signature
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(requestBody));
        const digest = shasum.digest('hex');

        console.log('Computed Signature:', digest);
        console.log('Received Signature:', event.headers['x-razorpay-signature']);

        // Validate the signature
        if (digest !== event.headers['x-razorpay-signature']) {
            throw new Error('Invalid signature');
        }

        if (requestBody.event === 'payment_link.paid') {
            console.log('Payment confirmed');

            // Extract orderId from the notes
            const orderId = requestBody.payload.payment_link.entity.notes.ecom_order_id;
            console.log('Order ID:', orderId);

            

            // Update the order status in DynamoDB
            await updatePaymentStatus(orderId, 'Paid');
            await deleteCartItemsByOrderId(orderId)
            console.log('Order payment status updated to "Paid"');
        } else {
            console.log('Payment not confirmed');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Webhook processed successfully' }),
        };
    } catch (error) {
        console.error('Error processing webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};

async function updatePaymentStatus(orderId, paymentStatus) {
    const updateParams = {
        TableName: process.env.ORDER_TABLE,
        Key: marshall({ id: orderId }),
        UpdateExpression: 'SET paymentDetails.#status = :paymentStatus, orderStatus = :orderStatus',
        ExpressionAttributeValues: {
            ':paymentStatus': { S: paymentStatus },
            ':orderStatus': { S: 'Order placed' },
        },
        ExpressionAttributeNames: {
            '#status': 'status',
        }
    };

    try {
        await dynamoDB.send(new UpdateItemCommand(updateParams));
        console.log('Payment status and order status updated successfully');
    } catch (error) {
        console.error('Error updating payment and order status:', error);
        throw new Error('Failed to update payment and order status');
    }
}


async function deleteCartItemsByOrderId(orderId) {
    // Fetch order details using orderId
    const getOrderParams = {
        TableName: process.env.ORDER_TABLE,
        Key: marshall({ id: orderId })
    };

    try {
        const orderData = await dynamoDB.send(new GetItemCommand(getOrderParams));
        const orderDetails = unmarshall(orderData.Item);

        const items = orderDetails.items; // Extract the list of items

        if (items && items.length > 0) {
            for (const item of items) {
                const productId = item.productId;
                const userId = orderDetails.userId; // Assuming userId is a part of the order details

                if (productId && userId) {
                    const deleteParams = {
                        TableName: process.env.CART_TABLE,
                        Key: marshall({ UserId: userId, ProductId: productId })
                    };

                    await dynamoDB.send(new DeleteItemCommand(deleteParams));
                    console.log(`Cart item for userId: ${userId} and productId: ${productId} deleted successfully.`);
                } else {
                    console.log('Product ID or User ID not found in order details.');
                }
            }
        } else {
            console.log('No items found in order details.');
        }
    } catch (error) {
        console.error('Error deleting cart items:', error);
        throw new Error('Failed to delete cart items');
    }
}
