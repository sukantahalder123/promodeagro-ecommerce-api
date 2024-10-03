'use strict';


const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");



const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  // Add your configuration options here
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const dynamoDBs = new DynamoDBClient({ region: process.env.AWS_REGION });

module.exports.getProductById = async (event) => {
  try {
    const productId = event.pathParameters.id;
    const userId = event.queryStringParameters && event.queryStringParameters.userId;

    // Fetch product details
    const getProductParams = {
      TableName: process.env.PRODUCTS_TABLE,
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
    const params = {
      TableName: process.env.INVENTORY_TABLE,
      IndexName: "productIdIndex", // Replace with your actual GSI name
      KeyConditionExpression: "productId = :productId",
      ExpressionAttributeValues: {
        ":productId": { S: productId },
      },
    };

    const inventoryData = await dynamoDBs.send(new QueryCommand(params));
    const inventoryItem = (inventoryData.Items && inventoryData.Items.length > 0) ? unmarshall(inventoryData.Items[0]) : {};

    var product = productData.Item;
    product.price = inventoryItem.unitPrices[0].price;
    product.mrp = inventoryItem.unitPrices[0].discountedPrice;
    product.unitPrices = inventoryItem.unitPrices;




    // Convert qty to grams if necessary
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
        savingsPercentage: product.savingsPercentage || 0,
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
        TableName: process.env.CART_TABLE,
        Key: {
          'UserId': userId,
          'ProductId': productId
        }
      };
      const cartData = await dynamoDB.get(cartParams).promise();

      // Check if the product exists in the user's wishlist
      const wishlistParams = {
        TableName: process.env.WISHLIST_TABLE,
        Key: {
          'UserId': userId,
          'ProductId': productId
        }
      };
      const wishlistData = await dynamoDB.get(wishlistParams).promise();

      const inCart = cartData.Item ? true : false;
      const inWishlist = wishlistData.Item ? true : false;

      // Add selectedQuantityUnitPrice and selectedQuantityUnitMrp if the product is in the cart
      if (inCart && cartData.Item.QuantityUnits) {
        cartData.Item.selectedQuantityUnitPrice = cartData.Item.Price;
        cartData.Item.selectedQuantityUnitMrp = cartData.Item.Mrp;
      }

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
