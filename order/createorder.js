const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

// Create DynamoDB client with options to remove undefined values
const dynamoDB = new DynamoDBClient({
  // Add any specific configurations here
});

const orderTableName = process.env.ORDER_TABLE;
const customerTableName = process.env.CUSTOMER_TABLE;
const productTableName = process.env.PRODUCT_TABLE;

// Generate a random 5-digit number
function generateRandomOrderId() {
  return Math.floor(10000 + Math.random() * 90000);
}

// Handler function to create an order
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { items, paymentMethod, status, customerId,address, totalPrice, paymentDetails } = body; // Include paymentDetails here

    // Validate input
    if (!Array.isArray(items) || items.length === 0 || !customerId || !totalPrice || !paymentDetails) { // Check for paymentDetails
      throw new Error('Invalid input. "items" must be a non-empty array, "customerId", "totalPrice", and "paymentDetails" are required.');
    }

    const orderId = generateRandomOrderId().toString();

    // Fetch customer details
    const getCustomerParams = {
      TableName: customerTableName,
      Key: marshall({ id: customerId })
    };
    const { Item: customerItem } = await dynamoDB.send(new GetItemCommand(getCustomerParams));
    if (!customerItem) {
      throw new Error('Customer not found');
    }

    // Fetch product details for each item
    const products = [];
    for (const item of items) {
      const getProductParams = {
        TableName: productTableName,
        Key: marshall({ id: item.productId })
      };
      const { Item: productItem } = await dynamoDB.send(new GetItemCommand(getProductParams));
      if (!productItem) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }
      products.push(unmarshall(productItem));
    }

    // Prepare order item
    const orderItem = {
      id: orderId,
      createdAt: new Date().toISOString(),
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      paymentMethod: paymentMethod,
      status: status.toUpperCase() || "PENDING",
      totalPrice: totalPrice.toString(),
      customerId: customerId,
      address: address,
      paymentDetails: paymentDetails, // Include paymentDetails in the orderItem
      updatedAt: new Date().toISOString(),
      _lastChangedAt: Date.now().toString(),
      _version: '1',
      __typename: 'Order'
    };

    // Save order item to DynamoDB using PutItemCommand
    const putParams = {
      TableName: orderTableName,
      Item: marshall(orderItem)
    };

    await dynamoDB.send(new PutItemCommand(putParams));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order created successfully', orderId: orderId }),
    };
    
  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to process request', error: error.message }),
    };
  }
};
