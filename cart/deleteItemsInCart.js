const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { userId, productId } = JSON.parse(event.body);

    if (!userId || !productId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    const params = {
        TableName: 'CartItems',
        Key: {
            'UserId': userId,
            'ProductId': productId
        }
    };

    try {
        await docClient.delete(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Cart item deleted successfully" }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
};
