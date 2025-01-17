const axios = require('axios');
const crypto = require('crypto');
const { DynamoDBClient, UpdateItemCommand, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
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
            // Get current date in India (IST)
            const options = {
                timeZone: 'Asia/Kolkata', // Time zone for India
                year: 'numeric', // Include the year
                month: '2-digit', // Include the month in two-digit format
                day: '2-digit' // Include the day in two-digit format
            };

            // Format the date
            const currentDateInIndia = new Intl.DateTimeFormat('en-IN', options).format(new Date());
            console.log(currentDateInIndia); // Example output: "28/10/2024"

            await sendWhatsAppMessage(orderId, currentDateInIndia)
            console.log('Order payment status updated to "Paid"');

            // const bill = await generateBillImage(orderItems)
            // console.log(bill)

            // await shareBillOnWhatsaap(bill, addressDetails.name, addressDetails.phoneNumber)
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

async function sendWhatsAppMessage(orderId, date) {

    const token = process.env.FACEBOOK_ACCESS_TOKEN;

    const getOrderParams = {
        TableName: process.env.ORDER_TABLE,
        Key: marshall({ id: orderId })
    };

    console.log(getOrderParams)

    const orderData = await dynamoDB.send(new GetItemCommand(getOrderParams));
    const orderDetails = unmarshall(orderData.Item);
    const amount = orderDetails.totalPrice;
    const phoneNumber = orderDetails.address.phoneNumber;
    console.log(orderDetails)


    let data = JSON.stringify({
        "messaging_product": "whatsapp",
        "to": phoneNumber,
        "type": "text",
        "text": {
            "body": `✨ *Payment Successful!* 🎉✨\n\n*Order Details:*\n🛒 *Order ID:* ${orderId}\n💰 *Amount:* ₹${amount}\n📅 *Date:* ${date}\n\nThank you for your purchase with *Pramode Agro Farms!* 🌾\n\nWe appreciate your trust in us and look forward to serving you again! 😊`
        }
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://graph.facebook.com/v19.0/208582795666783/messages',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        data: data
    };

    try {
        const response = await axios.request(config);
        console.log(JSON.stringify(response.data));
    } catch (error) {
        console.error(error);
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
