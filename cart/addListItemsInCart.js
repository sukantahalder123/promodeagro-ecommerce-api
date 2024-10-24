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
    const { userId, cartItems } = JSON.parse(event.body);

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

            let unitPrice;
            let price, mrp, savings, subtotal;
            const InventoryParams = {
                TableName: process.env.INVENTORY_TABLE,
                IndexName: "productIdIndex", // Replace with your actual GSI name
                KeyConditionExpression: "productId = :productId",
                ExpressionAttributeValues: {
                    ":productId": { S: productId },
                },
            };

            const inventoryData = await dynamoDB.send(new QueryCommand(InventoryParams));
            const inventoryItem = (inventoryData.Items && inventoryData.Items.length > 0) ? unmarshall(inventoryData.Items[0]) : {};

            if (product.unit.toUpperCase() === 'GRAMS') {
                for (let i = inventoryItem.unitPrices.length - 1; i >= 0; i--) {
                    if (quantityUnits === inventoryItem.unitPrices[i].qty) {
                        unitPrice = inventoryItem.unitPrices[i];
                        break;
                    }
                }

                if (!unitPrice) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: "Invalid quantity units for KG" }),
                    };
                }

                price = parseFloat(unitPrice.price);
                mrp = parseFloat(unitPrice.mrp);
                savings = parseFloat((unitPrice.savings * quantity).toFixed(2));
                subtotal = parseFloat((price * quantity).toFixed(2));

            } else if (['PIECES', 'KGS', 'LITRES'].includes(product.unit.toUpperCase())) {
                if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: "Invalid product pricing" }),
                    };
                }

                price = parseFloat(inventoryItem.onlineStorePrice);
                mrp = parseFloat(inventoryItem.compareAt);
                savings = parseFloat(((mrp - price) * quantity).toFixed(2));
                subtotal = parseFloat((price * quantity).toFixed(2));
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid product unit" }),
                };
            }

            // Prepare the item to be stored in the CartItems table
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
                    Price: price,
                    category: product.category,
                    // subcategory: product.subcategory,
                    Subtotal: subtotal,
                    Mrp: mrp
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
