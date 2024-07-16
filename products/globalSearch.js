const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { query } = event.queryStringParameters || {};

    if (!query) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Query parameter is required" }),
        };
    }

    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        FilterExpression: "contains(#name, :query) OR contains(#category, :query) OR contains(#subCategory, :query) OR contains(#description, :query)",
        ExpressionAttributeNames: {
            "#name": "name",
            "#category": "category",
            "#subCategory": "subCategory",
            "#description": "description"
        },
        ExpressionAttributeValues: {
            ":query": query
        }
    };

    try {
        const data = await docClient.scan(params).promise();
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
