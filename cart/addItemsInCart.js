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

exports.handler = async (event) => {
    const { userId, productId, quantity } = JSON.parse(event.body);

    if (!userId || !productId || !quantity) {
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

        // Fetch product details
        const product = await getProductDetails(productId);

        if (!product) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Product not found" }),
            };
        }

        // Convert savingsPercentage and mrp to numbers
        const savingsPercentage = Number(product.savingsPercentage);
        const mrp = Number(product.mrp);

        // Ensure savingsPercentage and mrp are valid numbers
        if (isNaN(savingsPercentage) || isNaN(mrp)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid product data" }),
            };
        }

        // Calculate savings and adjust price
        const savings = (savingsPercentage / 100) * mrp;
        const price = mrp - savings;

        // Calculate subtotal
        const subtotal = price * quantity;
        const totalSavings = savings * quantity;

        const params = {
            TableName: 'CartItems',
            Item: {
                UserId: userId,
                ProductId: productId,
                Quantity: quantity,
                Savings: totalSavings,
                Price: price,
                Subtotal: subtotal,
                Mrp: mrp
            },
        };

        await docClient.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item added to cart successfully" }),
        };
    } catch (error) {
        console.error('Error adding item to cart:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
