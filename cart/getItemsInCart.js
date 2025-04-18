const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// Constants
const FREE_DELIVERY_THRESHOLD = 300;
const FREE_DELIVERY_THRESHOLD_HYDERABAD = 100;
const FREE_DELIVERY_ZIP_CODES = ['500086', '500091', '500030','500093'];
const DEFAULT_DELIVERY_CHARGE = 50;
const HYDERABAD_DELIVERY_CHARGE = 20;

// DynamoDB client configuration
const dynamoDBClient = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Helper functions
const calculateDeliveryCharges = (subTotal, zipCode) => {
    if (!zipCode) {
        return {
            charges: subTotal > FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_DELIVERY_CHARGE,
            tag: `Unlock free shipping on purchases over ₹${FREE_DELIVERY_THRESHOLD}`
        };
    }

    if (FREE_DELIVERY_ZIP_CODES.includes(zipCode)) {
        return {
            charges: subTotal > FREE_DELIVERY_THRESHOLD_HYDERABAD ? 0 : HYDERABAD_DELIVERY_CHARGE,
            tag: `Unlock free shipping on purchases over ₹${FREE_DELIVERY_THRESHOLD_HYDERABAD}`
        };
    }

    return {
        charges: subTotal > FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_DELIVERY_CHARGE,
        tag: `Unlock free shipping on purchases over ₹${FREE_DELIVERY_THRESHOLD}`
    };
};

const calculateCartTotals = (items) => {
    return items.reduce((acc, item) => ({
        subTotal: acc.subTotal + (item.Subtotal || 0),
        savings: acc.savings + (item.Savings || 0)
    }), { subTotal: 0, savings: 0 });
};

// Database operations
const getUserDetails = async (userId) => {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: { UserId: userId }
    };

    try {
        const command = new GetCommand(params);
        const { Item } = await docClient.send(command);
        return Item;
    } catch (error) {
        console.error('Error fetching user details:', error);
        throw new Error('Failed to fetch user details');
    }
};

const getAddressDetails = async (userId, addressId) => {
    if (!addressId) return null;

    const params = {
        TableName: process.env.ADDRESS_TABLE,
        Key: {
            userId,
            addressId
        }
    };

    try {
        const command = new GetCommand(params);
        const { Item } = await docClient.send(command);
        return Item;
    } catch (error) {
        console.error('Error fetching address:', error);
        return null;
    }
};

const getCartItems = async (userId) => {
    const params = {
        TableName: process.env.CART_TABLE,
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    };

    try {
        const command = new QueryCommand(params);
        const { Items } = await docClient.send(command);
        return Items;
    } catch (error) {
        console.error('Error fetching cart items:', error);
        throw new Error('Failed to fetch cart items');
    }
};

// Main handler
exports.handler = async (event) => {
    try {
        const { addressId, userId } = event.queryStringParameters;

        if (!userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing userId in query parameters" })
            };
        }

        // Validate user exists
        const user = await getUserDetails(userId);
        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" })
            };
        }

        // Get cart items and calculate totals
        const cartItems = await getCartItems(userId);
        const { subTotal, savings } = calculateCartTotals(cartItems);

        // Get delivery charges
        const addressDetails = await getAddressDetails(userId, addressId);
        const { charges: deliveryCharges, tag: chargestag } = calculateDeliveryCharges(
            subTotal,
            addressDetails?.zipCode
        );

        // Calculate final total
        const finalTotal = subTotal + deliveryCharges;

        return {
            statusCode: 200,
            body: JSON.stringify({
                items: cartItems,
                subTotal: subTotal.toFixed(2),
                savings: savings.toFixed(2),
                deliveryCharges,
                finalTotal: finalTotal.toFixed(2),
                chargestag
            })
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message
            })
        };
    }
};
