require('dotenv').config(); // Load environment variables from .env file

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.deleteCustomerById = async (event) => {
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

    // Delete the customer record
    await dynamodb.delete(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Customer deleted successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error deleting customer: ' + error.message })
    };
  }
};
