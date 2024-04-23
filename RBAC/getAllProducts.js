
// const AWS = require('aws-sdk');
// require('dotenv').config();

// const dynamoDB = new AWS.DynamoDB.DocumentClient();
const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1', 
    endpoint: 'http://localhost:8000' 
});
require('dotenv').config();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
module.exports.handler = async (event) =>
 {
    try {
        const params = {
            TableName: 'Product-hxojpgz675cmbad5uyoeynwh54-dev',
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