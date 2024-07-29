'use strict';

const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

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
    const data = await docClient.send(new ScanCommand(params));
    const products = data.Items;

    // Convert qty to grams in unitPrices
    products.forEach(product => {
      if (product.unitPrices) {
        product.unitPrices = product.unitPrices.map(unitPrice => ({
          ...unitPrice,
          qty: unitPrice.qty
        }));
      }
    });

    if (userId) {
      // Fetch cart items for the user
      const cartParams = {
        TableName: 'CartItems',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const cartData = await docClient.send(new QueryCommand(cartParams));
      const cartItems = cartData.Items;

      // Fetch wishlist items for the user
      const wishlistParams = {
        TableName: 'ProductWishLists',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const wishlistData = await docClient.send(new QueryCommand(wishlistParams));
      const wishlistItems = wishlistData.Items;
      const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

      products.forEach(product => {
        const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
        const inWishlist = wishlistItemsSet.has(product.id);

        if (cartItem) {
          product.inCart = true;
          product.cartItem = cartItem;
        } else {
          product.inCart = false;
          product.cartItem = {
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
        }

        product.inWishlist = inWishlist;
      });
    } else {
      products.forEach(product => {
        product.inCart = false;
        product.inWishlist = false;
        product.cartItem = {
          ProductId: product.id,
          UserId: 'defaultUserId',
          Savings: 0,
          QuantityUnits: 0,
          Subtotal: 0,
          Price: 0,
          Mrp: 0,
          Quantity: 0,
          productImage: product.image || '',
          productName: product.name || ''
        };
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
