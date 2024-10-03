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

exports.handler = async (event) => {
    const { userId, productId } = JSON.parse(event.body);

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

        const product = await getProductDetails(productId);

        if (!product) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Product not found" }),
            };
        }

        const params = {
            TableName: process.env.WISHLIST_TABLE,
            Item: {
                UserId: userId,
                ProductId: productId,
                productName: product.name,
                productImage: product.image,
                price: product.price,
                mrp: product.mrp
            },
        };

        await docClient.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Product added to wishlist successfully" }),
        };
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
