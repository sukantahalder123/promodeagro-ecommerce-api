const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { category } = event.queryStringParameters;

    if (!category) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Category is required" }),
        };
    }

    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        IndexName: 'category-index', // Ensure an index on the 'Category' attribute exists
        KeyConditionExpression: 'category = :category',
        ExpressionAttributeValues: {
            ':category': category.toUpperCase(),
        },
    };

    try {
        const data = await docClient.query(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
