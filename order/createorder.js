const { DynamoDBClient, GetItemCommand, QueryCommand, PutItemCommand, DeleteItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const crypto = require('crypto')
require('dotenv').config();
const AWS = require('aws-sdk');
const axios = require('axios');


AWS.config.update({ region: 'ap-south-1' }); // Replace with your desired region

const stepfunctions = new AWS.StepFunctions();

const orderProcessSFArn = 'arn:aws:states:ap-south-1:851725323791:stateMachine:OrderTrackingStateMachine-prod';

const { v4: uuidv4 } = require('uuid');
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const lambda = new LambdaClient({});
const { createPaymentLink } = require('../payment/CashFreeOrder');
const { generateBillImage } = require('../whatsaapNotifications/generateBillImage');
const { shareBillOnWhatsaap } = require('../whatsaapNotifications/shareBillOnWhatsaap');
const { Console } = require('console');
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
const productTableName = process.env.PRODUCTS_TABLE;
const addressTableName = process.env.ADDRESS_TABLE; // Add the address table name
const cartTableName = process.env.CART_TABLE; // Add the cart table name
const deliverySlotTableName = process.env.DELIVERY_SLOT_TABLE; // Add the delivery slot table name
// Generate a random 5-digit number
function generateRandomOrderId() {
  const part1 = a();
  const part2 = a();
  const s1 = BigInt(`0x${part1}`).toString().slice(0, 7);
  const s2 = BigInt(`0x${part2}`).toString().slice(0, 7);
  return `401-${s1}-${s2}`;
}

function a() {
  return crypto.randomBytes(10).toString("hex");
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
    Key: marshall({
      userId: userId,

      addressId: addressId
    }) // Ensure this matches your table's key schema
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
  const params = {
    TableName: process.env.INVENTORY_TABLE,
    IndexName: "productIdIndex", // Replace with your actual GSI name
    KeyConditionExpression: "productId = :productId",
    ExpressionAttributeValues: {
      ":productId": { S: productId },
    },
  };

  // const inventoryData = await dynamoDB.send(new QueryCommand(params));
  const inventoryData = await dynamoDB.send(new QueryCommand(params));

  const getProductParams = {
    TableName: productTableName,
    Key: marshall({ id: productId })
  };
  const { Item: productItem } = await dynamoDB.send(new GetItemCommand(getProductParams));
  if (!productItem) {
    throw new Error(`Product with ID ${productId} not found`);
  }


  console.log(productItem)
  if (!productItem) {
    throw new Error(`Product with ID ${productId} not found`);
  }
  const product = unmarshall(productItem);

  let price, mrp, savings, subtotal;
  const inventoryItem = (inventoryData.Items && inventoryData.Items.length > 0) ? unmarshall(inventoryData.Items[0]) : {};

  if (product.unit.toUpperCase() === 'PIECES') {
    // For PCS, we assume there's a single price for each piece
    if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
      throw new Error("Invalid product pricing for PCS");
    }

    price = parseFloat(inventoryItem.onlineStorePrice);
    mrp = parseFloat(inventoryItem.compareAt) || 0;
    savings = parseFloat(((mrp - price) * quantity).toFixed(2));
    subtotal = parseFloat((price * quantity).toFixed(2));


  } else if (product.unit.toUpperCase() === 'KGS') {
    // For PCS, we assume there's a single price for each piece
    if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
      throw new Error("Invalid product pricing for PCS");
    }

    price = parseFloat(inventoryItem.onlineStorePrice);
    mrp = parseFloat(inventoryItem.compareAt) || 0;
    savings = parseFloat(((mrp - price) * quantity).toFixed(2));
    subtotal = parseFloat((price * quantity).toFixed(2));


  } else if (product.unit.toUpperCase() === 'LITRES') {
    // For PCS, we assume there's a single price for each piece
    if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
      throw new Error("Invalid product pricing for PCS");
    }

    price = parseFloat(inventoryItem.onlineStorePrice);
    mrp = parseFloat(inventoryItem.compareAt) || 0;
    savings = parseFloat(((mrp - price) * quantity).toFixed(2));
    subtotal = parseFloat((price * quantity).toFixed(2));


  }
  else if (product.unit.toUpperCase() === 'GRAMS') {
    // For KG, find the appropriate unit price based on quantityUnits
    console.log("Inventory")
    console.log(inventoryItem.unitPrices)
    if (!inventoryItem.unitPrices) {
      throw new Error("Invalid product unitPrices for KG");
    }

    var unitPrice = null;
    for (let i = inventoryItem.unitPrices.length - 1; i >= 0; i--) {
      if (quantityUnits === inventoryItem.unitPrices[i].qty) {
        console.log(inventoryItem.unitPrices[i])
        unitPrice = inventoryItem.unitPrices[i];
        break;
      }
    }
    console.log(unitPrice)

    if (!unitPrice) {
      throw new Error("Invalid quantity units for KG");
      console.log("error")
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
// async function getDeliverySlotDetails(slotId) {
//   const getSlotParams = {
//     TableName: deliverySlotTableName,
//     Key: marshall({ slotId })
//   };

//   try {
//     const { Item: slotItem } = await dynamoDB.send(new GetItemCommand(getSlotParams));
//     return slotItem ? unmarshall(slotItem) : null;
//   } catch (error) {
//     console.error('Error fetching delivery slot:', error);
//     throw new Error('Error fetching delivery slot details');
//   }
// }
async function getDeliverySlotDetails(slotId) {
  try {
    const scanParams = {
      TableName: deliverySlotTableName, // Ensure this is properly initialized
    };

    // Fetch all records from the DynamoDB table

    console.log(slotId)
    const { Items } = await dynamoDB.send(new ScanCommand(scanParams));
    if (!Items || Items.length === 0) {
      return null; // No records found
    }

    // Unmarshall all items into usable JavaScript objects
    const allSlots = Items.map((item) => unmarshall(item));

    // Traverse the structure to find the matching slotId
    let matchedSlot = null;
    let matchedShift = null;
    let date = null;
    const currentDate = new Date();


    for (const slot of allSlots) {      // console.log("slot")
      // console.log(slot)
      if (slot.shifts) {
        for (const shift of slot.shifts) {

          for (const slotDetails of shift.slots || []) {
            if (slotDetails.id === slotId) {

              console.log()
              if (slot.deliveryType === "same day") {
                date = currentDate.toISOString().split("T")[0];


              }
              else {
                const tomorrowDate = new Date(currentDate);
                tomorrowDate.setDate(currentDate.getDate() + 1);

                // Format tomorrow's date (e.g., YYYY-MM-DD)
                date = tomorrowDate.toISOString().split("T")[0];
              }
              matchedSlot = slotDetails;
              console.log(matchedSlot)
              matchedShift = shift.name;
              console.log("Matched Shift:", shift.name);

              break;
            }
          }
          if (matchedSlot) break;
        }
      }
      if (matchedSlot) break;
    }

    // Return the matched slot details or null if not found
    return {
      slot: matchedSlot,
      shift: matchedShift,
      date: date
    } || null;
  } catch (error) {
    console.error('Error fetching delivery slot details:', error);
    throw new Error('Error fetching delivery slot details');
  }
}



// Handler function to create an order
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { items, userId, addressId, paymentDetails, deliverySlotId } = body; // Extract all required fields

    // Initialize an array to hold missing or invalid fields
    const errors = [];

    // Validate input fields
    if (!Array.isArray(items) || items.length === 0) {
      errors.push('"items" must be a non-empty array');
    }
    if (!userId) {
      errors.push('"userId" is required');
    }
    if (!addressId) {
      errors.push("please select address");
    }
    if (!paymentDetails) {
      errors.push("please select paymentDetails");
    }
    if (!deliverySlotId) {
      errors.push("please select delivery slot");
    }

    // If there are errors, throw an error with details
    if (errors.length > 0) {
      throw new Error(errors);
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
    console.log("deliverryyyyyy")
    const deliverySlotDetails = await getDeliverySlotDetails(deliverySlotId);

    console.log(deliverySlotDetails)
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
      totalSavings += savings;
      // Accumulate savings for each item

      console.log(subtotal)
      console.log(totalPrice)
      var deliveryCharges = totalPrice > 300 ? 0 : 50;

      console.log(deliveryCharges)

      // Add delivery charges to subtotal if applicable
      var finalTotal = totalPrice + deliveryCharges;

      orderItems.push({
        productId: item.productId,
        productName: product.name,
        productImage: product.image,
        unit: product.unit,
        quantity: item.quantity,
        quantityUnits: item.quantityUnits,
        price: price,
        mrp: mrp,
        savings: savings,
        subtotal: subtotal
      });

      console.log(orderItems)

      // Delete the item from the cart after processing
      if (paymentDetails.method === "cash") {

        await deleteCartItem(userId, item.productId);
      }
    }


    if (paymentDetails.method === "cash") {
      paymentDetails.method = "COD"
      paymentDetails.status = "PENDING"
      console.log("billllsss")

      const bill = await generateBillImage(orderItems)
      console.log(bill)
      console.log("billllsss")

      const response = await shareBillOnWhatsaap(bill, addressDetails.name, addressDetails.phoneNumber)

    } else {
      console.log("testing")

      const payment = await createPaymentLink(orderId, addressDetails, userId, finalTotal);
      paymentDetails.status = "PENDING"
      paymentDetails.method = "Prepaid"
      paymentDetails.paymentLink = payment;
    }



    //  await sendBill(addressDetails.phoneNumber, process.env.FACEBOOK_ACCESS_TOKEN, orderItems)

    console.log(paymentDetails);
    console.log("USER DETAILS : ", userDetails);
    const subTotal = orderItems.reduce((acc, item) => {
      return acc + item.subtotal
    }, 0)

    const orderItem = {
      id: orderId,
      createdAt: getCurrentISTTime(),
      items: orderItems,
      totalPrice: totalPrice.toFixed(2),
      subTotal: subTotal,
      finalTotal: finalTotal,
      deliveryCharges: deliveryCharges,
      customerId: userId,
      customerName: addressDetails.name,
      customerNumber: addressDetails.phoneNumber,
      tax: 0,
      totalSavings: totalSavings.toFixed(2), // Ensure totalSavings is formatted to 2 decimal places
      userId: userId, // Use userId instead of customerId
      address: addressDetails, // Use the fetched address details
      paymentDetails: paymentDetails, // Include paymentDetails in the orderItem
      deliverySlot: {
        id: deliverySlotDetails.slot.id,
        startTime: deliverySlotDetails.slot.start,
        endTime: deliverySlotDetails.slot.end,
        shift: deliverySlotDetails.shift,
        endAmPm: deliverySlotDetails.slot.endAmPm,
        startAmPm: deliverySlotDetails.slot.startAmPm,
        date : deliverySlotDetails.date
      },
      // status: "Order placed",
      updatedAt: getCurrentISTTime(),
      _lastChangedAt: getCurrentISTTime(),
      _version: '1',
      __typename: 'Order'
    };

    console.log("ORDER ")
    console.log(orderItem)

    // Save order item to DynamoDB using PutItemCommand
    const putParams = {
      TableName: orderTableName,
      Item: marshall(orderItem)
    };
    const SFparams = {
      stateMachineArn: orderProcessSFArn,
      input: JSON.stringify({
        id: orderId
      })
    };
    const res = await stepfunctions.startExecution(SFparams).promise();
    console.log(res);
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

    if (paymentDetails.paymentLink) {

      console.log("online")
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Order created successfully', statuscode: 200, paymentLink: paymentDetails.paymentLink }),
      };
    } else {
      console.log("cash")

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Order created successfully', statuscode: 200, orderId: orderId }),
      };
    }



  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Failed to process request', statuscode: 200, error: error.message }),
    };
  }
};



async function sendBill(number, token, items) {
  try {
    // Calculate the total price and format the items into a string
    let totalPrice = 0;
    let itemsList = items.map(item => {
      let price = parseFloat(item.price);
      let quantity = parseInt(item.quantity);
      let subtotal = price * quantity;
      totalPrice += subtotal;

      // Return the formatted string for each item
      return `${item.productName} ${price.toFixed(2).padStart(6)} ${quantity.toString().padStart(8)} ${subtotal.toFixed(2).padStart(8)}`;
    }).join('\n');

    // Format the bill content
    let billContent = `
* Your Bill *

Item                 Price  Qty  Subtotal
----------------------------------------
${itemsList}
----------------------------------------
Total: ${totalPrice.toFixed(2).padStart(8)}
`;

    let data = JSON.stringify({
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": number,
      "type": "text",
      "text": {
        "body": billContent.trim()
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

    const response = await axios.request(config);
    console.log(response)
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}