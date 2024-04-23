require('dotenv').config(); // Load environment variables from .env file

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.getAllCustomer = async (event) => {
  try {
    // Fetch the table name from the environment variable
    const tableName = process.env.CUSTOMER_TABLE;
    console.log(tableName)

    const params = {
      TableName: tableName
    };

    const result = await dynamodb.scan(params).promise();
    const customers = result.Items;

    return {
      statusCode: 200,
      body: JSON.stringify(customers)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify('Error retrieving data: ' + error.message)
    };
  }
};