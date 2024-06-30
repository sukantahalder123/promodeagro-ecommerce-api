const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const userId = event.pathParameters.userId;

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing userId in path parameters" }),
        };
    }

    const params = {
        TableName: 'CartItems',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    };

    try {
        const data = await docClient.query(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ items: data.Items }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
};
