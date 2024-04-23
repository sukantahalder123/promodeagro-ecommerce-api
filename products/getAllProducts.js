
const AWS = require('aws-sdk');
require('dotenv').config();

const dynamoDB = new AWS.DynamoDB.DocumentClient();
module.exports.handler = async (event) => {
    try {
        const params = {
            TableName: process.env.PRODUCT_TABLE,
        };

        const data = await dynamoDB.scan(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        console.error('Error fetching products:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch products' }),
        };
    }
};