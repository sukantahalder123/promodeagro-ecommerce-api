const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const OFFERS_TABLE = process.env.OFFERS_TABLE;

exports.handler = async (event) => {
    try {
        // Fetch all offers from DynamoDB
        const scanParams = {
            TableName: OFFERS_TABLE,
        };

        const scanResult = await dynamoDB.scan(scanParams).promise();

        // Extract offers from scan result
        const offers = scanResult.Items;

        return {
            statusCode: 200,
            body: JSON.stringify(offers),
        };
    } catch (error) {
        console.error('Failed to fetch offers:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch offers', error: error.message }),
        };
    }
};
