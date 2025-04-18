const { StandardCheckoutClient, MetaInfo, Env, StandardCheckoutPayRequest } = require('pg-sdk-node');
const { randomUUID } = require('crypto');
require('dotenv').config();
const clientId = process.env.PHONEPAY_ID;
const clientSecret = process.env.PHONEPAY_SECRET;
const clientVersion = 1;  //insert your client version here
const env = Env.PRODUCTION;      //change to Env.PRODUCTION when you go live

async function initiatePayment(userId,orderId, amount) {
    const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
    const redirectUrl = `https://www.promodeagro.com/mycart/address/order-placed/${orderId}`;
    const metaInfo = MetaInfo.builder()
    .udf1(userId)// Store extra info if needed
    .build();

    const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(orderId)
        .amount(amount * 100)
        .redirectUrl(redirectUrl)
        .metaInfo(metaInfo)
        .build();

    try {
        const response = await client.pay(request);
        console.log("Checkout Page URL:", response.redirectUrl);
        return response.redirectUrl;
    } catch (error) {
        console.error("Payment initiation failed:", error);
        throw error;
    }
}

// New handler function

exports.handler = async (event) => {
    try {
        // Check if event.body exists and parse it
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Request body is missing"
                })
            };
        }

        const { amount, userId } = JSON.parse(event.body);

        // Validate both amount and userId
        if (!amount || !userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Both amount and userId are required"
                })
            };
        }

        // Validate amount is a positive number
        if (amount <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Amount must be a positive number"
                })
            };
        }

        // Validate userId is a non-empty string
        if (typeof userId !== 'string' || userId.trim().length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Invalid userId provided"
                })
            };
        }

        // Generate unique orderId
        const orderId = `ORDER_${randomUUID()}`;

        console.log("amount", amount);
        console.log("userId", userId);

        // Initiate payment with userId
        const paymentUrl = await initiatePayment(userId,orderId, amount);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                orderId: orderId,
                paymentUrl: paymentUrl,
                userId: userId
            })
        };

    } catch (error) {
        console.error('Payment creation failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to create payment",
                error: error.message
            })
        };
    }
};

