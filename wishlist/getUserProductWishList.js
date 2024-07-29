const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to fetch product details from DynamoDB
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

// Function to check if the user exists in the Users table
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

// Function to get wishlist items for the user
async function getWishlistItems(userId) {
    const params = {
        TableName: 'ProductWishLists',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        return data.Items;
    } catch (error) {
        console.error('Error fetching wishlist items:', error);
        throw error;
    }
}

// Function to get cart items for the user
async function getCartItems(userId) {
    const params = {
        TableName: 'CartItems',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        return data.Items;
    } catch (error) {
        console.error('Error fetching cart items:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId } = event.queryStringParameters;

    if (!userId) {
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

        // Fetch wishlist items
        const wishlistItems = await getWishlistItems(userId);

        // Create a list of product IDs from the wishlist items
        const productIds = wishlistItems.map(item => item.ProductId);

        // Fetch product details for each product ID
        const productDetailsPromises = productIds.map(id => getProductDetails(id));
        const productDetailsList = await Promise.all(productDetailsPromises);

        // Fetch cart items
        const cartItems = await getCartItems(userId);

        // Combine product details with cart items and wishlist status
        const result = productDetailsList.map(product => {
            const cartItem = cartItems.find(item => item.ProductId === product.id);
            const wishlistItem = wishlistItems.find(item => item.ProductId === product.id);
            return {
                ...product,
                inCart: !!cartItem,
                cartItem: cartItem || {
                    ProductId: product.id,
                    UserId: userId,
                    Savings: 0,
                    Subtotal: 0,
                    QuantityUnits: 0,
                    Price: 0,
                    Quantity: 0,
                    Mrp: 0,
                    productImage: product.image,
                    productName: product.name
                },
                inWishlist: !!wishlistItem
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('Error fetching user data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
