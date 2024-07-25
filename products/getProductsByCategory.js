const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
  const { category, userId } = event.queryStringParameters;

  if (!category) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Category is required" }),
    };
  }

  const params = {
    TableName: process.env.PRODUCTS_TABLE,
    IndexName: 'category-index', // Ensure an index on the 'Category' attribute exists
    KeyConditionExpression: 'category = :category',
    ExpressionAttributeValues: {
      ':category': category.toUpperCase(),
    },
  };

  try {
    const data = await docClient.query(params).promise();
    const products = data.Items;

    // Convert qty to grams in unitPrices
    products.forEach(product => {
      if (product.unitPrices) {
        product.unitPrices = product.unitPrices.map(unitPrice => ({
          ...unitPrice,
          qty: `${unitPrice.qty} grams`
        }));
      }
    });

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
        const cartItem = cartItems.find(item => item.ProductId === product.id) || null;

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
            Quantity: "0 grams",
            productImage: product.image || '',
            productName: product.name || ''
          };
        }
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
