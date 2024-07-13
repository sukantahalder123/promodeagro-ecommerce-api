const { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

// Create DynamoDB client with options to remove undefined values
const dynamoDB = new DynamoDBClient({
  // Add any specific configurations here
});

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

  // Find the appropriate unit price based on quantityUnits
  let unitPrice = null;
  for (let i = product.unitPrices.length - 1; i >= 0; i--) {
    if (quantityUnits === product.unitPrices[i].qty) {
      unitPrice = product.unitPrices[i];
      break;
    }
  }

  if (!unitPrice) {
    throw new Error("Invalid quantity units");
  }

  const price = unitPrice.price;
  const mrp = unitPrice.mrp;
  const savings = unitPrice.savings * quantity;

  // Calculate total quantity in grams
  const totalQuantityInGrams = quantity * quantityUnits;

  // Calculate the subtotal and total savings for the quantity
  const subtotal = price * quantity;

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
      createdAt: new Date().toISOString(),
      items: orderItems,
      totalPrice: totalPrice.toString(),
      totalSavings: totalSavings.toString(), // Include totalSavings in the order item
      userId: userId, // Use userId instead of customerId
      address: addressDetails, // Use the fetched address details
      paymentDetails: paymentDetails, // Include paymentDetails in the orderItem
      deliverySlot: {
        id: deliverySlotDetails.slotId,
        startTime: deliverySlotDetails.startTime,
        endTime: deliverySlotDetails.endTime
      },
      status: "PLACED",
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
