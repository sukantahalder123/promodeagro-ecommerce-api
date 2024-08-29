const axios = require('axios');

async function createPaymentLink(amount, description, order_id) {
    try {
        const referenceId = 'PROMODE' + Math.floor(Math.random() * 10000); // Generating random reference ID


        const auth = {
            username: 'your_test_api_key', // Replace with your test API key
            password: 'your_test_api_secret', // Replace with your test API secret
        };

        const custom_attributes = {
            "ecom_order_id": order_id
        };

        const data = JSON.stringify({
            "amount": amount * 100, // Convert amount to smallest currency unit (e.g., paise for INR)
            "currency": "INR",
            "accept_partial": false,
            "callback_url": 'https://promodeagro.com/mycart/address/order-placed/'+order_id, // Redirect URL after payment
            "expire_by": 1735671600, // Example expiry timestamp
            "reference_id": referenceId,
            "description": description,
            "notes": custom_attributes,
            "notify": {
                "sms": true,
                "email": true
            },
            "reminder_enable": true
        });

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.razorpay.com/v1/payment_links',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64'), // Use template literals to concatenate keys
            },
            data: data
        };

        const response = await axios.request(config);
        console.log(response)
        return response.data.short_url; // Returning the short URL from the response
    } catch (error) {
        console.error('Error creating payment link:', error);
        throw error;
    }
}

module.exports = {
    createPaymentLink
};
