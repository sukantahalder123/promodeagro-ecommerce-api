const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { subcategory } = event.queryStringParameters;

    if (!subcategory) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Subcategory is required" }),
        };
    }

    const params = {
        TableName: process.env.PRODUCTS_TABLE,
        IndexName: 'subCategory-index', // Ensure an index on the 'Subcategory' attribute exists
        KeyConditionExpression: 'subCategory = :subcategory',
        ExpressionAttributeValues: {
            ':subcategory': subcategory,
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
