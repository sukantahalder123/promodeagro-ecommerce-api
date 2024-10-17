const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
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
        const product = await getProductDetails(productId);

        if (!product) {
            return { statusCode: 404, message: "Product not found" };
        }

        let price, mrp, savings, subtotal;
        const InventoryParams = {
            TableName: process.env.INVENTORY_TABLE,
            IndexName: "productIdIndex",
            KeyConditionExpression: "productId = :productId",
            ExpressionAttributeValues: { ":productId": { S: productId } },
        };

        const inventoryData = await dynamoDB.send(new QueryCommand(InventoryParams));
        const inventoryItem = (inventoryData.Items && inventoryData.Items.length > 0) ? unmarshall(inventoryData.Items[0]) : {};

        // Pricing logic based on product.unit
        if (product.unit.toUpperCase() === 'GRAMS') {
            let unitPrice = inventoryItem.unitPrices.find(item => item.qty === quantityUnits);
            if (!unitPrice) {
                return { statusCode: 400, message: "Invalid quantity units for GRAMS" };
            }
            price = unitPrice.price;
            mrp = unitPrice.mrp;
        } else if (['PIECES', 'KGS', 'LITRES'].includes(product.unit.toUpperCase())) {
            price = inventoryItem.onlineStorePrice;
            mrp = inventoryItem.compareAt;
        } else {
            return { statusCode: 400, message: "Invalid product unit" };
        }

        savings = ((mrp - price) * quantity).toFixed(2);
        subtotal = (price * quantity).toFixed(2);

        const params = {
            TableName: process.env.CART_TABLE,
            Key: { 'UserId': userId, 'ProductId': productId },
            UpdateExpression: 'SET Quantity = :quantity, QuantityUnits = :quantityUnits, Subtotal = :subtotal, Price = :price, Mrp = :mrp, Savings = :savings',
            ExpressionAttributeValues: {
                ':quantity': quantity,
                ':quantityUnits': quantityUnits,
                ':subtotal': parseFloat(subtotal),
                ':price': parseFloat(price),
                ':mrp': parseFloat(mrp),
                ':savings': parseFloat(savings),
            },
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.update(params).promise();
        return { statusCode: 200, message: "Cart item updated successfully" };
    } catch (error) {
        console.error('Error updating cart item:', error);
        return { statusCode: 500, message: "Internal Server Error", error };
    }
}

exports.handler = async (event) => {
    const { userId, cartItems } = JSON.parse(event.body);

    if (!userId || !Array.isArray(cartItems) || cartItems.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields or cart items" }),
        };
    }

    try {
        const user = await getUserDetails(userId);
        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const results = [];
        for (const item of cartItems) {
            const { productId, quantity, quantityUnits } = item;
            const updateResult = await updateCartItem(userId, productId, quantity, quantityUnits);
            results.push(updateResult);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Cart items processed", results }),
        };
    } catch (error) {
        console.error('Error processing cart items:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
