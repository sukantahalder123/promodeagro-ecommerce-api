const { Cashfree } = require('cashfree-pg');
require('dotenv').config();

// Set CashFree credentials
Cashfree.XClientId = process.env.CASHFREE_APP_ID; // Store in environment variables
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY; // Store in environment variables
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // Set to SANDBOX for testing

// Lambda function to handle the CashFree Webhook
module.exports.handler = async (event) => {
  try {
    // Extract webhook signature and timestamp from the headers

    console.log(event)
    const webhookSignature = event.headers['x-webhook-signature'];
    const webhookTimestamp = event.headers['x-webhook-timestamp'];

    // Extract raw body for signature verification
    const rawBody = event.body;

    // Verify the webhook signature
    const isValid = Cashfree.PGVerifyWebhookSignature(webhookSignature, rawBody, webhookTimestamp);

    // If the signature is invalid, return error response
    if (!isValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid webhook signature' }),
      };
    }

    // Parse the incoming webhook data
    const webhookData = JSON.parse(rawBody);
    console.log('Received valid CashFree webhook:', webhookData);

    // Example: Process the webhook data based on payment status
    const paymentStatus = webhookData.data.transaction_status;
    const orderId = webhookData.data.link_id;

    if (paymentStatus === 'SUCCESS') {
      console.log(`Order ${orderId} payment was successful.`);
      // You can update your order status in the database here
    } else {
      console.log(`Order ${orderId} payment failed.`);
    }

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Webhook received and processed' }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
