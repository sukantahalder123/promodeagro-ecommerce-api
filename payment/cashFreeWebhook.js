const { Cashfree } = require('cashfree-pg');
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const axios = require('axios');
require('dotenv').config();

// Initialize DynamoDB client
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });


// Set CashFree credentials
Cashfree.XClientId = process.env.CASHFREE_APP_ID; // Store in environment variables
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY; // Store in environment variables
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // Set to SANDBOX for testing

const { generateBillImage } = require('../whatsaapNotifications/generateBillImage');
const { shareBillOnWhatsaap } = require('../whatsaapNotifications/shareBillOnWhatsaap');

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
    const paymentStatus = webhookData.data.payment.payment_status;
    const orderId = webhookData.data.order.order_tags.ecom_id;
    console.log(webhookData.data.order.order_tags.ecom_id)

    if (paymentStatus === 'SUCCESS') {
      console.log("updating")
      const up = await updatePaymentStatus(orderId, 'Paid');
      console.log(up)
      console.log("commpleted status update")

      //   await deleteCartItemsByOrderId(orderId)
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

      const orderItems = await getOrderDetails(orderId);
      console.log(orderItems)
      const bill = await generateBillImage(orderItems.items)
      console.log(bill)

      await shareBillOnWhatsaap(bill, orderItems.address.name, orderItems.address.phoneNumber)
      // You can update your order status in the database here
      console.log(`Order ${orderId} payment was successful.`);
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



async function updatePaymentStatus(orderId, paymentStatus) {
  const updateParams = {
    TableName: process.env.ORDER_TABLE,
    Key: marshall({ id: orderId }),
    UpdateExpression: 'SET paymentDetails.#status = :paymentStatus, orderStatus = :orderStatus',
    ExpressionAttributeValues: {
      ':paymentStatus': { S: paymentStatus },
      ':orderStatus': { S: 'Order placed' },
    },
    ExpressionAttributeNames: { '#status': 'status' },
  };

  try {
    await dynamoDB.send(new UpdateItemCommand(updateParams));
    console.log('Payment status and order status updated successfully');
  } catch (error) {
    console.error('Error updating payment status:', error.message);
    throw new Error('Failed to update payment status');
  }
}

async function getOrderDetails(orderId) {
  const getParams = { TableName: process.env.ORDER_TABLE, Key: marshall({ id: orderId }) };
  try {
    const data = await dynamoDB.send(new GetItemCommand(getParams));
    return unmarshall(data.Item);
  } catch (error) {
    console.error('Error fetching order details:', error.message);
    throw new Error('Failed to fetch order details');
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
