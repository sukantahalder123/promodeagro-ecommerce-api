

const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require('pg-sdk-node');
const { randomUUID } = require('crypto');


const clientId = process.env.PHONEPAY_ID;
const clientSecret = process.env.PHONEPAY_SECRET;
const clientVersion = 1;  //insert your client version here
const env = Env.PRODUCTION;      //change to Env.PRODUCTION when you go live

async function initiatePayment(orderId, amount) {

    const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
    const redirectUrl = `https://www.promodeagro.com/mycart/address/order-placed/${orderId}`;

    const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(orderId)
        .amount(amount *100 )
        .redirectUrl(redirectUrl)
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

module.exports = {
    initiatePayment
};
