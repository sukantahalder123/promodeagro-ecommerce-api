require('dotenv').config(); // Load environment variables from .env file

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.getCustomerById = async (event) => {
  try {
    // Fetch the table name from the environment variable
    const tableName = process.env.CUSTOMER_TABLE;

    // Extract customerId from the path parameters
    const customerId = event.pathParameters.customerId;

    const params = {
      TableName: tableName,
      Key: {
        id: customerId // Assuming 'id' is the primary key attribute
      }
    };

    const data = await dynamodb.get(params).promise();

    if (!data.Item) {
      // Customer not found
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Customer not found' })
      };
    }

    // Customer found, return the customer data
    return {
      statusCode: 200,
      body: JSON.stringify(data.Item)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error retrieving data: ' + error.message })
    };
  }
};
