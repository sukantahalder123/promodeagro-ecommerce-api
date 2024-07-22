'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  // Add your configuration options here
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const userId = event.queryStringParameters && event.queryStringParameters.userId;

    // Fetch all products
    const getAllProductsParams = {
      TableName: 'Products',
    };
    const productsData = await dynamoDB.scan(getAllProductsParams).promise();

    if (!productsData.Items || productsData.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No products found' }),
      };
    }

    let response = {
      statusCode: 200,
      body: JSON.stringify(productsData.Items),
    };

    let productsWithCartInfo = productsData.Items.map(product => {
      const defaultCartItem = {
        ProductId: product.id,
        UserId: userId || 'defaultUserId', // Assign a default userId if not provided
        Savings: 0,
        QuantityUnits: 0,
        Subtotal: 0,
        Price: 0,
        Mrp: 0,
        Quantity: 0,
        productImage: product.image || '',
        productName: product.name || ''
      };

      return {
        ...product,
        inCart: false,
        cartItem: defaultCartItem,
      };
    });

    if (userId) {
      // Fetch cart items for the user
      const getCartItemsParams = {
        TableName: 'CartItems',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      };
      const cartData = await dynamoDB.query(getCartItemsParams).promise();
      const cartItemsMap = new Map();

      // Map cart items by ProductId for easy lookup
      if (cartData.Items) {
        cartData.Items.forEach(item => {
          cartItemsMap.set(item.ProductId, item);
        });
      }

      // Merge cart items with products
      productsWithCartInfo = productsData.Items.map(product => {
        const defaultCartItem = {
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

        const cartItem = cartItemsMap.get(product.id) || defaultCartItem;
        return {
          ...product,
          inCart: cartItemsMap.has(product.id),
          cartItem,
        };
      });
    }

    response.body = JSON.stringify(productsWithCartInfo);

    return response;
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch products', error }),
    };
  }
};
