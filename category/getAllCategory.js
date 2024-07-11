const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

const categoryTable = process.env.CATEGORY_TABLE;

module.exports.handler = async (event) => {
    try {
        const params = {
            TableName: categoryTable,
        };
        const data = await dynamoDB.send(new ScanCommand(params));
        const categories = data.Items.map(item => unmarshall(item));
        return {
            statusCode: 200,
            body: JSON.stringify(categories),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not retrieve categories' }),
        };
    }
};
