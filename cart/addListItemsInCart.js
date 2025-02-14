const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const dynamoDB = new DynamoDBClient();
const { unmarshall } = require("@aws-sdk/util-dynamodb");

require('dotenv').config();

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


async function emptyUserCart(userId) {
    // Query to get all items in the cart for the user
    const params = {
        TableName: process.env.CART_TABLE,
        KeyConditionExpression: "UserId = :userId",
        ExpressionAttributeValues: {
            ":userId": userId,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        const cartItems = data.Items;

        // If there are items in the cart, delete them
        if (cartItems && cartItems.length > 0) {
            for (const item of cartItems) {
                const deleteParams = {
                    TableName: process.env.CART_TABLE,
                    Key: {
                        UserId: userId,
                        ProductId: item.ProductId, // Assuming ProductId is part of the primary key
                    },
                };
                await docClient.delete(deleteParams).promise();
            }
        }
    } catch (error) {
        console.error('Error emptying user cart:', error);
        throw error;
    }
}

// Function to update the cart with multiple items
exports.handler = async (event) => {
    const { userId, cartItems    } = JSON.parse(event.body);

    console.log(cartItems)
    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing or invalid cart items" }),
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

        if (cartItems.length === 0) {

            await emptyUserCart(userId);

            return {
                statusCode: 404,
                body: JSON.stringify({ message: "cart empty successfully" }),
            };

        }

        // Process each item in the cart
        for (const item of cartItems) {
            const { productId, quantity, quantityUnits } = item;

            if (!productId || !quantity || !quantityUnits) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Missing required fields in one of the items" }),
                };
            }

            // Fetch product details
            const product = await getProductDetails(productId);

            if (!product) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: `Product with ID ${productId} not found` }),
                };
            }

            const subtotal = product.sellingPrice * quantity;
            const mrps = product.comparePrice * quantity;
            const savings = mrps - subtotal; // Assuming `mrp` is the original price
            // Prepare the item to be stored in the CartItems table

            console.log(product)
            const params = {
                TableName: process.env.CART_TABLE,
                Item: {
                    UserId: userId,
                    productName: product.name,
                    productImage: product.image,
                    ProductId: productId,
                    Quantity: quantity,
                    QuantityUnits: quantityUnits,
                    Savings: savings,
                    Price: product.sellingPrice,
                    category: product.category,
                    // subcategory: product.subcategory,
                    Subtotal: subtotal,
                    Mrp: product.comparePrice,
                },
            };
            console.log(params)
            const addedcart = await docClient.put(params).promise();
            console.log(addedcart)
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Items added to cart successfully" }),
        };
    } catch (error) {
        console.error('Error adding items to cart:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
