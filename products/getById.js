'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  // Add your configuration options here
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports.getProductById = async (event) => {
  try {
    const productId = event.pathParameters.id;
    const userId = event.queryStringParameters && event.queryStringParameters.userId;

    // Fetch product details
    const getProductParams = {
      TableName: 'Products',
      Key: {
        'id': productId
      }
    };
    const productData = await dynamoDB.get(getProductParams).promise();

    if (!productData.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    let product = productData.Item;

    // Convert qty to grams
    if (product.unitPrices) {
      product.unitPrices = product.unitPrices.map(unitPrice => ({
        ...unitPrice,
        qty: unitPrice.qty
      }));
    }

    let response = {
      statusCode: 200,
      body: JSON.stringify(product),
    };

    if (userId) {
      // Initialize default cart item
      const defaultCartItem = {
        ProductId: productId,
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

      // Check if the product exists in the user's cart
      const cartParams = {
        TableName: 'CartItems',
        Key: {
          'UserId': userId,
          'ProductId': productId
        }
      };
      const cartData = await dynamoDB.get(cartParams).promise();

      // Check if the product exists in the user's wishlist
      const wishlistParams = {
        TableName: 'ProductWishLists',
        Key: {
          'UserId': userId,
          'ProductId': productId
        }
      };
      const wishlistData = await dynamoDB.get(wishlistParams).promise();

      const inCart = cartData.Item ? true : false;
      const inWishlist = wishlistData.Item ? true : false;

      response.body = JSON.stringify({
        ...product,
        inCart,
        inWishlist,
        cartItem: inCart ? cartData.Item : defaultCartItem
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching product:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch product', error }),
    };
  }
};
