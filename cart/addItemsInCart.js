const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { userId, productId, quantity } = JSON.parse(event.body);

    if (!userId || !productId || !quantity) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    const params = {
        TableName: 'CartItems',
        Item: {
            UserId: userId,
            ProductId: productId,
            Quantity: quantity,
        },
    };

    try {
        await docClient.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item added to cart successfully" }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
};
