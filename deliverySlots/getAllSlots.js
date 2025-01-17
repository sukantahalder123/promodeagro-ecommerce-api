const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

module.exports.handler = async () => {
    const params = {
        TableName: process.env.DELIVERY_SLOT_TABLE,
    };

    try {
        const result = await dynamoDb.scan(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'All delivery slots fetched successfully',
                slots: result.Items,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to fetch all delivery slots',
                error: error.message,
            }),
        };
    }
};
