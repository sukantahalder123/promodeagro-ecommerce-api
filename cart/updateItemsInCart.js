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
        Key: {
            'UserId': userId,
            'ProductId': productId
        },
        UpdateExpression: 'SET Quantity = :quantity',
        ExpressionAttributeValues: {
            ':quantity': quantity
        },
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        const data = await docClient.update(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Cart item updated successfully", data }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
};
