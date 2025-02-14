const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();
const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const { unmarshall } = require("@aws-sdk/util-dynamodb");



// Function to fetch product details from DynamoDB
async function getProductDetails(productId) {
    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        Key: {
            id: productId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
    }
}

// Function to check if the user exists in the Users table
async function getUserDetails(userId) {
    const params = {
        TableName: process.env.USERS_TABLE,
        Key: {
            UserId: userId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error fetching user details:', error);
        throw error;
    }
}

// Function to update an existing cart item in DynamoDB
async function updateCartItem(userId, productId, quantity, quantityUnits) {
    try {
        // Fetch product details
        const product = await getProductDetails(productId);

        if (!product) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Product not found" }),
            };
        }

        let price, mrp;

        const subtotal = product.sellingPrice * quantity;
        const mrps = product.comparePrice * quantity;
        const savings = mrps - subtotal; // Assuming `mrp` is the original price
        // Prepare the item to be stored in the CartItems table

        
        const params = {
            TableName: process.env.CART_TABLE,
            Key: {
                'UserId': userId,
                'ProductId': productId
            },
            UpdateExpression: 'SET Quantity = :quantity, QuantityUnits = :quantityUnits, Subtotal = :subtotal, Price = :price, Mrp = :mrp, Savings = :savings',
            ExpressionAttributeValues: {
                ':quantity': quantity,
                ':quantityUnits': quantityUnits,
                ':subtotal': parseFloat(subtotal),
                ':price': parseFloat(product.sellingPrice),
                ':mrp': parseFloat(product.comparePrice),
                ':savings': parseFloat(savings)
            },
            ReturnValues: 'UPDATED_NEW'
        };

        const data = await docClient.update(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Cart item updated successfully", data }),
        };
    } catch (error) {
        console.error('Error updating cart item:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
}

exports.handler = async (event) => {
    const { userId, productId, quantity, quantityUnits } = JSON.parse(event.body);

    if (!userId || !productId || !quantity || !quantityUnits) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    try {
        // Check if the user exists
        const user = await getUserDetails(userId);

        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        // Update the cart item
        const updateResult = await updateCartItem(userId, productId, quantity, quantityUnits);

        return {
            statusCode: updateResult.statusCode,
            body: updateResult.body,
        };
    } catch (error) {
        console.error('Error updating cart item:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};