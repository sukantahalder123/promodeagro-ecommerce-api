'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-1', // Set your AWS region
  endpoint: 'http://localhost:8000' // Use this for local testing with DynamoDB Local
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports.getProductById = async (event) => {
  try {
    const productId = event.pathParameters.id;
    const params = {
      TableName: 'Product-hxojpgz675cmbad5uyoeynwh54-dev', 
      Key: {
        'id': productId 
      }
    };

    const data = await dynamoDB.get(params).promise();

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data.Item),
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch product' }),
    };
  }
};
