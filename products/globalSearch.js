'use strict';

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
  const { query } = event.queryStringParameters || {};
  const userId = event.queryStringParameters && event.queryStringParameters.userId;

  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Query parameter is required" }),
    };
  }

  const params = {
    TableName: process.env.PRODUCTS_TABLE,
    FilterExpression: "contains(#name, :query) OR contains(#category, :query) OR contains(#subCategory, :query) OR contains(#description, :query)",
    ExpressionAttributeNames: {
      "#name": "name",
      "#category": "category",
      "#subCategory": "subCategory",
      "#description": "description"
    },
    ExpressionAttributeValues: {
      ":query": query
    }
  };

  try {
    const data = await docClient.scan(params).promise();
    const products = data.Items;

    if (userId) {
      const cartParams = {
        TableName: 'CartItems',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const cartData = await docClient.query(cartParams).promise();
      const cartItems = cartData.Items;

      products.forEach(product => {
        const cartItem = cartItems.find(item => item.ProductId === product.id) || {
          ProductId: product.id,
          UserId: userId,
          Savings: 0,
          QuantityUnits: 0,
          Subtotal: 0,
          Price: 0,
          Mrp: 0,
          Quantity: 0,
          productImage: product.image || '',
          productName: product.name || ''
        };

        product.inCart = !!cartItem;
        product.cartItem = cartItem;
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(products),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
};
