require('dotenv').config(); // Load environment variables from .env file
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.updateCustomer = async (event) => {
  try {
    const customerId = event.pathParameters.customerId; // Extract customerId from the endpoint

    const requestBody = JSON.parse(event.body);
    const { name, phone } = requestBody;

    // Fetch the table name from the environment variable
    const tableName = process.env.CUSTOMER_TABLE;
    console.log(tableName)
    

    const customerExists = await getCustomerById(customerId);
    console.log(customerExists)
    if (customerExists) {
      // Customer exists, update only name and phone
      const params = {
        TableName: tableName,
        Key: { id: customerId },
        UpdateExpression: "set #n = :name, #p = :phone",
        ExpressionAttributeNames: {
          "#n": "name",
          "#p": "phone"
        },
        ExpressionAttributeValues: {
          ":name": name,
          ":phone": phone
        },
        ReturnValues: "ALL_NEW"
      };

      const updatedCustomer = await dynamodb.update(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify(updatedCustomer.Attributes)
      };
    } else {
      // Customer doesn't exist, return error
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Customer not found' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error updating/inserting data: ' + error.message })
    };
  }
};

async function getCustomerById(id) {
  const tableName = process.env.CUSTOMER_TABLE;
  const params = {
    TableName: tableName,
    Key: { id }
  };

  try {
    const data = await dynamodb.get(params).promise();
    return !!data.Item; // Returns true if the customer exists, false otherwise
  } catch (error) {
    console.error("Error retrieving customer:", error);
    throw error;
  }
}
