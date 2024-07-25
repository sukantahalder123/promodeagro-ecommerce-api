const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to check if the product exists
async function getProductDetails(productId) {
    const params = {
        TableName: 'Products',
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

        // Delete the item from the ProductWishLists table
        const params = {
            TableName: 'ProductWishLists',
            Key: {
                UserId: userId,
                ProductId: productId
            },
        };

        await docClient.delete(params).promise();

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
