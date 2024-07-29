const { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' }); // Replace with your desired region

const stepfunctions = new AWS.StepFunctions();

const orderProcessSFArn = 'arn:aws:states:us-east-1:851725323791:stateMachine:OrderTrackingStateMachineCCC6EC83-qv7Q5pbK9DSj';

const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const lambda = new LambdaClient({});

// Create DynamoDB client with options to remove undefined values
const dynamoDB = new DynamoDBClient({
  // Add any specific configurations here
});
const getCurrentISTTime = () => {
  const utcDate = new Date();
  // Convert UTC to IST by adding 5 hours and 30 minutes
  const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toISOString();
};


const orderTableName = process.env.ORDER_TABLE;
const userTableName = process.env.USERS_TABLE;
const productTableName = process.env.PRODUCT_TABLE;
const addressTableName = process.env.ADDRESS_TABLE; // Add the address table name
const cartTableName = process.env.CART_TABLE; // Add the cart table name
const deliverySlotTableName = process.env.DELIVERY_SLOT_TABLE; // Add the delivery slot table name

// Generate a random 5-digit number
function generateRandomOrderId() {
  return Math.floor(10000 + Math.random() * 90000);
}

// Function to fetch user details by userId
async function getUserDetails(userId) {
  const getUserParams = {
    TableName: userTableName,
    Key: marshall({ UserId: userId })
  };
  const { Item: userItem } = await dynamoDB.send(new GetItemCommand(getUserParams));
  return userItem ? unmarshall(userItem) : null;
}

// Function to fetch address details by addressId
async function getAddressDetails(userId, addressId) {
  const getAddressParams = {
    TableName: addressTableName,
    Key: marshall({ userId: userId, addressId: addressId }) // Ensure this matches your table's key schema
  };

  try {
    const { Item: addressItem } = await dynamoDB.send(new GetItemCommand(getAddressParams));
    return addressItem ? unmarshall(addressItem) : null;
  } catch (error) {
    console.error('Error fetching address:', error);
    throw new Error('Error fetching address details');
  }
}

// Function to fetch product details by productId
async function getProductDetails(productId, quantity, quantityUnits) {
  const getProductParams = {
    TableName: productTableName,
    Key: marshall({ id: productId })
  };
  const { Item: productItem } = await dynamoDB.send(new GetItemCommand(getProductParams));
  if (!productItem) {
    throw new Error(`Product with ID ${productId} not found`);
  }
  const product = unmarshall(productItem);

  let price, mrp, savings, subtotal;

  if (product.unit.toUpperCase() === 'PCS') {
    // For PCS, we assume there's a single price for each piece
    if (!product.price || !product.mrp) {
      throw new Error("Invalid product pricing for PCS");
    }

    price = parseFloat(product.price);
    mrp = parseFloat(product.mrp);
    savings = parseFloat(((mrp - price) * quantity).toFixed(2));
    subtotal = parseFloat((price * quantity).toFixed(2));

  } else if (product.unit.toUpperCase() === 'GRAMS') {
    // For KG, find the appropriate unit price based on quantityUnits
    if (!product.unitPrices || !Array.isArray(product.unitPrices)) {
      throw new Error("Invalid product unitPrices for KG");
    }

    let unitPrice = null;
    for (let i = product.unitPrices.length - 1; i >= 0; i--) {
      if (quantityUnits === product.unitPrices[i].qty) {
        unitPrice = product.unitPrices[i];
        break;
      }
    }

    if (!unitPrice) {
      throw new Error("Invalid quantity units for KG");
    }

    price = parseFloat(unitPrice.price);
    mrp = parseFloat(unitPrice.mrp);
    savings = parseFloat((unitPrice.savings * quantity).toFixed(2));
    subtotal = parseFloat((price * quantity).toFixed(2));

  } else {
    throw new Error("Invalid product unit");
  }

  return {
    product,
    price,
    mrp,
    savings,
    subtotal
  };
}

// Function to delete cart items by userId and productId
async function deleteCartItem(userId, productId) {
  const deleteParams = {
    TableName: cartTableName,
    Key: marshall({ UserId: userId, ProductId: productId })
  };

  await dynamoDB.send(new DeleteItemCommand(deleteParams));
}

// Function to fetch delivery slot details by slotId
async function getDeliverySlotDetails(slotId) {
  const getSlotParams = {
    TableName: deliverySlotTableName,
    Key: marshall({ slotId })
  };

  try {
    const { Item: slotItem } = await dynamoDB.send(new GetItemCommand(getSlotParams));
    return slotItem ? unmarshall(slotItem) : null;
  } catch (error) {
    console.error('Error fetching delivery slot:', error);
    throw new Error('Error fetching delivery slot details');
  }
}

// Handler function to create an order
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { items, userId, addressId, paymentDetails, deliverySlotId } = body; // Include addressId, paymentDetails, and deliverySlotId here

    // Validate input
    if (!Array.isArray(items) || items.length === 0 || !userId || !addressId || !paymentDetails || !deliverySlotId) { // Check for addressId, userId, paymentDetails, and deliverySlotId
      throw new Error('Invalid input. "items" must be a non-empty array, "userId", "addressId", "paymentDetails", and "deliverySlotId" are required.');
    }

    const orderId = generateRandomOrderId().toString();

    // Fetch user details using userId
    const userDetails = await getUserDetails(userId);
    if (!userDetails) {
      throw new Error('User not found');
    }

    // Fetch address details using addressId
    const addressDetails = await getAddressDetails(userId, addressId);
    if (!addressDetails) {
      throw new Error('Address not found');
    }

    // Fetch delivery slot details using deliverySlotId
    const deliverySlotDetails = await getDeliverySlotDetails(deliverySlotId);
    if (!deliverySlotDetails) {
      throw new Error('Delivery slot not found');
    }

    // Prepare order items with calculated totals
    let totalPrice = 0;
    let totalSavings = 0; // Initialize totalSavings accumulator
    const orderItems = [];
    for (const item of items) {
      const { product, price, mrp, savings, subtotal } = await getProductDetails(item.productId, item.quantity, item.quantityUnits);

      totalPrice += subtotal;
      totalSavings += savings; // Accumulate savings for each item

      orderItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        quantityUnits: item.quantityUnits,
        price: price,
        mrp: mrp,
        savings: savings,
        subtotal: subtotal
      });

      // Delete the item from the cart after processing
      await deleteCartItem(userId, item.productId);
    }

    // Prepare order item
    const orderItem = {
      id: orderId,
      createdAt: getCurrentISTTime(),
      items: orderItems,
      totalPrice: totalPrice.toFixed(2), // Ensure totalPrice is formatted to 2 decimal places
      totalSavings: totalSavings.toFixed(2), // Ensure totalSavings is formatted to 2 decimal places
      userId: userId, // Use userId instead of customerId
      address: addressDetails, // Use the fetched address details
      paymentDetails: paymentDetails, // Include paymentDetails in the orderItem
      deliverySlot: {
        id: deliverySlotDetails.slotId,
        startTime: deliverySlotDetails.startTime,
        endTime: deliverySlotDetails.endTime
      },
      status: "Order placed",
      updatedAt: getCurrentISTTime(),
      _lastChangedAt: getCurrentISTTime(),
      _version: '1',
      __typename: 'Order'
    };

    // Save order item to DynamoDB using PutItemCommand
    const putParams = {
      TableName: orderTableName,
      Item: marshall(orderItem)
    };
    const params = {
      stateMachineArn: orderProcessSFArn,
      input: JSON.stringify({ body: JSON.stringify(orderItem) }) // Wrap the input in the expected structure
  };
    const data = await stepfunctions.startExecution(params).promise();

    await dynamoDB.send(new PutItemCommand(putParams));

    const saleEvent = {
        body: {

          orderId: orderItem.id // Replace with your actual order ID
        }
    }; const params = {
      FunctionName: process.env.FUNCTION_A_ARN,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(saleEvent, null, 2)),
    };

    // Create the command and send it
    const command = new InvokeCommand(params);
    const response = await lambda.send(command);
    console.log(response)


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
