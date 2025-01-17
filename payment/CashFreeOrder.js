const axios = require('axios');
require('dotenv').config();

async function createPaymentLink(order_id, customerDetails, id, amount) {
    try {
        const data = {
            "customer_details": {
                "customer_phone": id,
                "customer_phone": customerDetails.phoneNumber,
                "customer_name": customerDetails.name
            },
            "link_notify": {
                "send_sms": true
            },
            "link_amount": amount, // Amount in INR
            "link_currency": "INR",
            "link_id": order_id, // Unique ID for the payment link
            "link_purpose": "payment",
            "link_meta": {
                "return_url": `https://promodeagro.com/mycart/address/order-placed/${order_id}`,
                "notify_url":`https://promodeagro.com/mycart/address/order-placed/${order_id}`,
            },
            "link_auto_reminders": true,

            "link_notes": { // Custom fields go here
                "ecom_id": order_id
            }
        };

        const config = {
            method: 'post',
            url: 'https://sandbox.cashfree.com/pg/links', // Use sandbox for testing
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-client-id': process.env.CASHFREE_APP_ID, // Store in environment variables in production
                'x-client-secret': process.env.CASHFREE_SECRET_KEY // Store securely
            },
            data: JSON.stringify(data)
        };

        const response = await axios.request(config);
        console.log('Payment Link Created Successfully:', response.data);
        return response.data.link_url; // Returns the payment link details
    } catch (error) {
        console.error('Error Creating Payment Link:', error.response ? error.response.data : error.message);
        throw error;
    }
}


module.exports = {
    createPaymentLink
};
