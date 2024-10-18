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
            // Find the appropriate unit price based on quantityUnits for KG
            let unitPrice = null;
            for (let i = inventoryItem.unitPrices.length - 1; i >= 0; i--) {
                if (quantityUnits === inventoryItem.unitPrices[i].qty) {
                    unitPrice = inventoryItem.unitPrices[i];
                    break;
                }
            }

            if (!unitPrice) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid quantity units for GRAMS" }),
                };
            }

            price = unitPrice.price;
            mrp = unitPrice.mrp;
            savings = (unitPrice.savings * quantity).toFixed(2);
            subtotal = (price * quantity).toFixed(2);

        } else if (product.unit.toUpperCase() === 'PIECES') {
            // For PCS, we assume there's a single price for each piece
            if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid product pricing for PCS" }),
                };
            }

            price = inventoryItem.onlineStorePrice;
            mrp = inventoryItem.compareAt;
            savings = ((mrp - price) * quantity).toFixed(2);
            subtotal = (price * quantity).toFixed(2);

        } else if (product.unit.toUpperCase() === 'KGS') {
            // For PCS, we assume there's a single price for each piece
            if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid product pricing for PCS" }),
                };
            }

            price = inventoryItem.onlineStorePrice;
            mrp = inventoryItem.compareAt;
            savings = ((mrp - price) * quantity).toFixed(2);
            subtotal = (price * quantity).toFixed(2);

        }  else if (product.unit.toUpperCase() === 'LITRES') {
            // For PCS, we assume there's a single price for each piece
            if (!inventoryItem.onlineStorePrice || !inventoryItem.compareAt) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid product pricing for PCS" }),
                };
            }

            price = inventoryItem.onlineStorePrice;
            mrp = inventoryItem.compareAt;
            savings = ((mrp - price) * quantity).toFixed(2);
            subtotal = (price * quantity).toFixed(2);

        }  else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid product unit" }),
            };
        }

        // Prepare the item update parameters for DynamoDB
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
                ':price': parseFloat(price),
                ':mrp': parseFloat(mrp),
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