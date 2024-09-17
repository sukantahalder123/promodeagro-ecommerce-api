const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
  const { category, userId, pageSize = 10, pageNumber = 1, exclusiveStartKey } = event.queryStringParameters;

  if (!category) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Category is required" }),
    };
  }

  // Decode the ExclusiveStartKey
  const decodedExclusiveStartKey = exclusiveStartKey 
    ? JSON.parse(Buffer.from(decodeURIComponent(exclusiveStartKey), 'base64').toString('utf8'))
    : undefined;

  try {

    console.log(category.toLowerCase())
    // Fetch total item count for the category
    const countParams = {
      TableName: process.env.PRODUCTS_TABLE,
      IndexName: 'category-index',
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category.toLowerCase(),
      },
      Select: 'COUNT',
    };
    const countData = await docClient.query(countParams).promise();
    const totalItems = countData.Count;
    const totalPages = Math.ceil(totalItems / parseInt(pageSize));

    // Fetch paginated products
    const params = {
      TableName: process.env.PRODUCTS_TABLE,
      IndexName: 'category-index', // Ensure an index on the 'Category' attribute exists
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category.toLowerCase(),
      },
      Limit: parseInt(pageSize),
      ExclusiveStartKey: decodedExclusiveStartKey,
      FilterExpression: '#availability = :trueValue',
      ExpressionAttributeNames: {
        '#availability': 'availability',
      },
      ExpressionAttributeValues: {
        ':trueValue': { BOOL: true }, // Adjust this according to the AWS SDK v3 format
      },
    };


    const totalProductsparam = {
      TableName: process.env.PRODUCTS_TABLE,
      IndexName: 'category-index', // Ensure an index on the 'Category' attribute exists
      KeyConditionExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category.toLowerCase(),
      },
      };

    const data = await docClient.query(params).promise();
    const TotalProducts = await docClient.query(totalProductsparam).promise();

    const products = data.Items || [];

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

      const cartData = await docClient.query(cartParams).promise();
      const cartItems = cartData.Items;

      // Fetch wishlist items for the user
      const wishlistParams = {
        TableName: 'ProductWishLists',
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const wishlistData = await docClient.query(wishlistParams).promise();
      const wishlistItems = wishlistData.Items;
      const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

      products.forEach(product => {
        const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
        const inWishlist = wishlistItemsSet.has(product.id);

        if (cartItem) {
          product.inCart = true;
          product.cartItem = {
            ...cartItem,
            selectedQuantityUnit: cartItem.QuantityUnits,
            selectedQuantityMrp: cartItem.Mrp,
          };
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

    // Encode the LastEvaluatedKey
    const encodedLastEvaluatedKey = data.LastEvaluatedKey 
      ? encodeURIComponent(Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64'))
      : null;

    // Prepare the response
    const response = {
      products: products,
      pagination: {
        currentPage: parseInt(pageNumber),
        pageSize: parseInt(pageSize),
        totalPages: totalPages,
        nextPage: encodedLastEvaluatedKey ? parseInt(pageNumber) + 1 : null,
        lastEvaluatedKey: encodedLastEvaluatedKey,
        // currentTotalProducts:products.length,
        TotalProducts: TotalProducts.Items.length
      },
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
};
