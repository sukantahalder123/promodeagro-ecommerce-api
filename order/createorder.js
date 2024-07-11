const { DynamoDBClient, GetItemCommand, PutItemCommand ,DeleteItemCommand} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();
const AWS = require('aws-sdk');

const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); // Import utc plugin for dayjs

dayjs.extend(utc); // Extend dayjs with utc plugin

// Create DynamoDB client with options to remove undefined values
const dynamoDB = new DynamoDBClient({
  // Add any specific configurations here
});

const orderTableName = process.env.ORDER_TABLE;
const userTableName = process.env.USERS_TABLE;
const productTableName = process.env.PRODUCT_TABLE;
const addressTableName = process.env.ADDRESS_TABLE; // Add the address table name

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


async function deleteCartItem(userId, productId) {
  const params = {
    TableName: 'CartItems',
    Key: {
      'UserId': { S: userId },      // Assuming userId is a string
      'ProductId': { S: productId } // Assuming productId is a string
    }
  };

  try {
    await dynamoDB.send(new DeleteItemCommand(params));

    console.log("Item deleted successfully")
    return { message: "Cart item deleted successfully" };
    
  } catch (error) {
    console.error("Error deleting cart item:", error);
    throw new Error("Internal Server Error");
  }
}



// Function to fetch address details by addressId
async function getAddressDetails(userId, addressId) {
  const getAddressParams = {
    TableName: addressTableName,
    Key: marshall({ userId: userId, addressId: addressId }) // Ensure this matches your table's key schema
  };

  console.log('Get Address Params:', getAddressParams);

  try {
    const { Item: addressItem } = await dynamoDB.send(new GetItemCommand(getAddressParams));
    console.log('Fetched Address Item:', addressItem);

    return addressItem ? unmarshall(addressItem) : null;
  } catch (error) {
    console.error('Error fetching address:', error);
    throw new Error('Error fetching address details');
  }
}


// Handler function to create an order
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { items, userId, addressId, paymentDetails } = body; // Include addressId and paymentDetails here

    // Validate input
    if (!Array.isArray(items) || items.length === 0 || !userId || !addressId || !paymentDetails) { // Check for addressId, userId, and paymentDetails
      throw new Error('Invalid input. "items" must be a non-empty array, "userId", "addressId", and "paymentDetails" are required.');
    }

    const orderId = generateRandomOrderId().toString();

    // Fetch user details using userId
    const userDetails = await getUserDetails(userId);
    if (!userDetails) {
      throw new Error('User not found');
    }

    console.log(userDetails)
    // Fetch address details using addressId
    const addressDetails = await getAddressDetails(userId, addressId);
    if (!addressDetails) {
      throw new Error('Address not found');
    }
    console.log('Fetched Address Details:', addressDetails);

    // Fetch product details for each item and calculate the total price
    let totalPrice = 0;
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
      const product = unmarshall(productItem);
      products.push(product);
      totalPrice += product.price * item.quantity;
    }

    // Prepare order item with current IST date and time
    const istDate = dayjs().utcOffset(330).format('YYYY-MM-DDTHH:mm:ss.SSSZ'); // Get current IST time with UTC offset +5:30 (IST)
    const orderItem = {
      id: orderId,
      createdAt: istDate, // Store in IST format
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      status: "PENDING",
      totalPrice: totalPrice.toString(),
      userId: userId,
      address: addressDetails,
      paymentDetails: paymentDetails,
      updatedAt: istDate, // Set updatedAt to current IST time
      _lastChangedAt: Date.now().toString(),
      _version: '1',
      __typename: 'Order'
    };

    // Save order item to DynamoDB using PutItemCommand
    const putParams = {
      TableName: orderTableName,
      Item: marshall(orderItem)
    };


    for (const item of items) {
      await deleteCartItem(userId, item.productId);
    }



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
