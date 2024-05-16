require('dotenv').config(); // Load environment variables from .env file

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.getCustomerByPhone = async (event) => {
  try {
    // Fetch the table name from the environment variable
    const tableName = process.env.CUSTOMER_TABLE;

    // Extract phone number from the path parameters
    const phoneNumber = event.pathParameters.phoneNumber;

    const params = {
      TableName: tableName
    };

    // Retrieve all customers from the DynamoDB table
    const data = await dynamodb.scan(params).promise();

    if (!data.Items || data.Items.length === 0) {
      // Customer not found
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Customer not found' })
      };
    }

    // Filter customers based on the provided phone number
    const customersWithPhoneNumber = data.Items.filter(customer => customer.phone === phoneNumber);

    if (customersWithPhoneNumber.length === 0) {
      // Customer with the provided phone number not found
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Customer not found' })
      };
    }

    // Return the customer data
    return {
      statusCode: 200,
      body: JSON.stringify(customersWithPhoneNumber)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error retrieving data: ' + error.message })
    };
  }
};
