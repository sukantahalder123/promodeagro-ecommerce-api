// handler.js

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

module.exports.handler = async (event) => {
    const { pincode } = event.pathParameters;

    const params = {
        TableName: process.env.DELIVERY_SLOT_TABLE,
        KeyConditionExpression: 'pincode = :pincode',
        FilterExpression: 'active = :active',

        ExpressionAttributeValues: {
            ':pincode': pincode,
            ':active': true,

        },
    };

    try {
        const result = await dynamoDb.query(params).promise();
        console.log(result)
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Delivery slots fetched successfully',
                slots: result.Items,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to fetch delivery slots',
                error: error.message,
            }),
        };
    }
};
