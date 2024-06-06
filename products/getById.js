'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports.getProductById = async (event) => {
  try {
    const productId = event.pathParameters.id;
    const params = {
      TableName: 'Products', 
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
