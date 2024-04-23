require('dotenv').config(); // Load environment variables from .env file
const AWS = require('aws-sdk');


const dynamodb = new AWS.DynamoDB.DocumentClient();

const generateCustomerId = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};


module.exports.insertCustomer = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    const { name, phone } = requestBody;

    const customerId = generateCustomerId();

    // Fetch the table name from the environment variable
    const tableName = process.env.CUSTOMER_TABLE;

    const params = {
      TableName: tableName,
      Item: {
        id: customerId,
        name,
        phone,
        
        __typename: 'Customer', // Add __typename attribute
        _lastChangedAt: Date.now(), // Add _lastChangedAt attribute
        _version: 1, // Add _version attribute
        updatedAt: new Date().toISOString(), // Add updatedAt attribute
        createdAt: new Date().toISOString() // Add createdAt attribute
      }
    };

    await dynamodb.put(params).promise();
    // Return the inserted item in the desired format
    return {
      statusCode: 200,
      body: JSON.stringify(params.Item)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error inserting data: ' + error.message })
    };
  }
};
