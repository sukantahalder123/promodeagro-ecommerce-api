const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    // Add AWS SDK configuration if needed
});

const tableName = process.env.ORDER_TABLE;
const indexName = 'userId-index'; // Replace with your actual index name

module.exports.handler = async (event) => {
    try {
        const userId = event.pathParameters.userId;

        console.log(userId);

        const queryParams = {
            TableName: tableName,
            IndexName: indexName,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': { S: userId }
            }
        };

        console.log(queryParams)

        const { Items } = await dynamoDB.send(new QueryCommand(queryParams));

        if (!Items || Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No orders found for this user' }),
            };
        }

        const orders = Items.map(item => {
            if (item) {
                return unmarshall(item);
            } else {
                console.error('Item is undefined or null:', item);
                throw new Error('Failed to unmarshall item from DynamoDB');
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Orders retrieved successfully', orders }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to process request', error: error.message }),
        };
    }
};
