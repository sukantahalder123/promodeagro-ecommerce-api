'use strict';

const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {
  try {
    const userId = event.queryStringParameters && event.queryStringParameters.userId;

    // Fetch all products
    const getAllProductsParams = {
      TableName: process.env.PRODUCTS_TABLE,
    };
    const productsData = await dynamoDB.send(new ScanCommand(getAllProductsParams));

    if (!productsData.Items || productsData.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No products found' }),
      };
    }

    let products = productsData.Items.map(item => unmarshall(item));

    // Convert qty to grams
    products = products.map(product => {
      if (product.unitPrices) {
        product.unitPrices = product.unitPrices.map(unitPrice => ({
          ...unitPrice,
          qty: unitPrice.qty
        }));
      }
      return product;
    });

    let productsWithCartInfo = products.map(product => {
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
        inWishlist: false, // Default value for wishlist status
        cartItem: defaultCartItem,
      };
    });

    if (userId) {
      // Fetch cart items for the user
      const getCartItemsParams = {
        TableName: 'CartItems',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
        },
      };
      const cartData = await dynamoDB.send(new QueryCommand(getCartItemsParams));
      const cartItemsMap = new Map();

      // Map cart items by ProductId for easy lookup
      if (cartData.Items) {
        cartData.Items.map(item => unmarshall(item)).forEach(item => {
          cartItemsMap.set(item.ProductId, item);
        });
      }

      // Fetch wishlist items for the user
      const getWishlistItemsParams = {
        TableName: 'ProductWishLists',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
        },
      };
      const wishlistData = await dynamoDB.send(new QueryCommand(getWishlistItemsParams));
      const wishlistItemsSet = new Set();

      // Map wishlist items by ProductId for easy lookup
      if (wishlistData.Items) {
        wishlistData.Items.map(item => unmarshall(item)).forEach(item => {
          wishlistItemsSet.add(item.ProductId);
        });
      }

      // Merge cart and wishlist items with products
      productsWithCartInfo = productsWithCartInfo.map(product => {
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
          inWishlist: wishlistItemsSet.has(product.id),
          cartItem,
        };
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(productsWithCartInfo),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch products', error }),
    };
  }
};
