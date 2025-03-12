'use strict';

const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const dynamoDBs = new DynamoDBClient({ region: process.env.AWS_REGION });

module.exports.getProductById = async (event) => {
  try {
    const productId = event.pathParameters.id;
    const userId = event.queryStringParameters?.userId;

    const getProductParams = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: { id: productId },
    };
    const productData = await dynamoDB.get(getProductParams).promise();

    if (!productData.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Product not found' }) };
    }

    const params = {
      TableName: process.env.INVENTORY_TABLE,
      IndexName: "productIdIndex",
      KeyConditionExpression: "productId = :productId",
      ExpressionAttributeValues: { ":productId": { S: productId } },
    };

    const inventoryData = await dynamoDBs.send(new QueryCommand(params));
    const inventoryItem = inventoryData.Items?.length > 0 ? unmarshall(inventoryData.Items[0]) : {};

    let product = formatProduct({ ...productData.Item, ...inventoryItem }, userId);

    let response = { statusCode: 200, body: JSON.stringify(product) };

    if (userId) {
      const cartParams = {
        TableName: process.env.CART_TABLE,
        Key: { 'UserId': userId, 'ProductId': productId }
      };
      const cartData = await dynamoDB.get(cartParams).promise();

      const wishlistParams = {
        TableName: process.env.WISHLIST_TABLE,
        Key: { 'UserId': userId, 'ProductId': productId }
      };
      const wishlistData = await dynamoDB.get(wishlistParams).promise();

      const inCart = Boolean(cartData.Item);
      const inWishlist = Boolean(wishlistData.Item);

      if (inCart && cartData.Item.QuantityUnits) {
        cartData.Item.selectedQuantityUnitPrice = cartData.Item.Price;
        cartData.Item.selectedQuantityUnitMrp = cartData.Item.Mrp;
      }

      response.body = JSON.stringify({
        ...product,
        inCart,
        inWishlist,
        cartItem: inCart ? cartData.Item : product.cartItem
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching product:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to fetch product', error }) };
  }
};

const formatProduct = (product, userId) => ({
  id: product.id,
  name: product.name || '',
  category: product.category || '',
  subCategory: product.subCategory || '',
  image: product.image || '',
  images: product.images || [],
  description: product.description || '',
  availability: product.availability || false,
  tags: product.tags || [],
  price: product.sellingPrice || 0,
  mrp: product.comparePrice || 0,
  unit: product.unit || '',
  inCart: false,
  inWishlist: false,
  cartItem: {
    ProductId: product.id,
    UserId: userId || 'defaultUserId',
    Savings: 0,
    QuantityUnits: 0,
    Subtotal: 0,
    Price: product.sellingPrice || 0,
    Mrp: product.comparePrice || 0,
    Quantity: 0,
    productImage: product.image || '',
    productName: product.name || '',
  }
});
