const AWS = require('aws-sdk');
require('dotenv').config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const mobileNumber = event.queryStringParameters?.mobileNumber;

    if (!mobileNumber) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Mobile number is required' }),
        };
    }

    const params = {
        TableName: process.env.USERS_TABLE,  // Replace with your DynamoDB table name
        IndexName: "MobileNumber-index",     // Replace with your GSI name
        KeyConditionExpression: "MobileNumber = :mobileNumber",
        ExpressionAttributeValues: {
            ":mobileNumber": mobileNumber
        }
    };

    try {
        const result = await dynamoDb.query(params).promise();

        if (result.Items && result.Items.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify(result.Items[0]),  // Assuming mobile numbers are unique
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'User not found' }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
};
