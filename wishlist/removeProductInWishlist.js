const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
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

// Function to check if the user exists
async function getUserDetails(userId) {
    const params = {
        TableName: 'Users',
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

// Function to check if the product exists in SaveForLater
async function getSaveForLaterItem(userId, productId) {
    const params = {
        TableName: 'SaveForLater',
        Key: {
            userId: userId,
            productId: productId
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error fetching SaveForLater item:', error);
        throw error;
    }
}

// Function to delete an item from a DynamoDB table
async function deleteItemFromTable(tableName, key) {
    const params = {
        TableName: tableName,
        Key: key,
    };

    try {
        await docClient.delete(params).promise();
    } catch (error) {
        console.error(`Error deleting item from ${tableName}:`, error);
        throw error;
    }
}

// Function to add an item to the CartItems table
async function addItemToCart(userId, product, saveForLaterItem) {
    const params = {
        TableName: 'CartItems',
        Item: {
            UserId: userId,
            ProductId: product.id,
            productName: product.name,
            productImage: product.image,
            Quantity: saveForLaterItem.Quantity,
            QuantityUnits: saveForLaterItem.QuantityUnits,
            Price: saveForLaterItem.price,
            subcategory:saveForLaterItem.subcategory,
            category:saveForLaterItem.category,
            Mrp: saveForLaterItem.mrp,
            Savings: saveForLaterItem.Savings,
            Subtotal: saveForLaterItem.Subtotal
        },
    };

    console.log(params)

    try {
        await docClient.put(params).promise();
    } catch (error) {
        console.error('Error adding item to cart:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId, productId } = event.queryStringParameters || {};

    if (!userId || !productId) {
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

        // Check if the product exists
        const product = await getProductDetails(productId);
        if (!product) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Product not found" }),
            };
        }

        // Check if the product exists in SaveForLater
        const saveForLaterItem = await getSaveForLaterItem(userId, productId);

        console.log(saveForLaterItem)
        if (saveForLaterItem) {
            // Add the item back to the cart
            await addItemToCart(userId, product, saveForLaterItem);
            console.log("added")

            // Remove from SaveForLater
            await deleteItemFromTable('SaveForLater', { userId: userId, productId: productId });
        }

        // Remove from wishlist
        await deleteItemFromTable('ProductWishLists', { UserId: userId, ProductId: productId });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Product removed from wishlist successfully" }),
        };
    } catch (error) {
        console.error('Error removing product from wishlist:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
