const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

require('dotenv').config();

exports.handler = async (event) => {
    const userId = event.pathParameters.userId;


    if (!userId) {
        throw new Error("UserId is required");
    }

    try {
        // Step 1: Query the table to get all items for the user
        const queryParams = {
            TableName: process.env.CART_TABLE,
            KeyConditionExpression: "UserId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId,
            },
        };

        const data = await docClient.query(queryParams).promise();
        const cartItems = data.Items;

        if (cartItems.length === 0) {
            return { message: "No items found in the cart" };
        }

        // Step 2: Use BatchWrite to delete all items
        const deleteRequests = cartItems.map((item) => ({
            DeleteRequest: {
                Key: {
                    UserId: item.UserId,
                    ProductId: item.ProductId, // Assuming ProductId is the sort key
                },
            },
        }));

        const batchWriteParams = {
            RequestItems: {
                [process.env.CART_TABLE]: deleteRequests,
            },
        };

        await docClient.batchWrite(batchWriteParams).promise();

        return { message: "All items removed from cart successfully" };
    } catch (error) {
        console.error("Error removing cart items:", error);
        throw error;
    }
}
