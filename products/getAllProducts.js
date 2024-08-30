const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {
  try {
    const userId = event.queryStringParameters && event.queryStringParameters.userId;
    const pageNumber = parseInt(event.queryStringParameters.pageNumber) || 1;
    const pageSize = parseInt(event.queryStringParameters.pageSize) || 10;
    const exclusiveStartKeyParam = event.queryStringParameters.exclusiveStartKey;
    const exclusiveStartKey = exclusiveStartKeyParam 
      ? JSON.parse(Buffer.from(decodeURIComponent(exclusiveStartKeyParam), 'base64').toString('utf8'))
      : undefined;

    console.log("Exclusive Start Key:", JSON.stringify(exclusiveStartKey, null, 2));

    // Fetch total item count
    const countParams = {
      TableName: process.env.PRODUCTS_TABLE,
      Select: "COUNT",
    };
    const countData = await dynamoDB.send(new ScanCommand(countParams));
    const totalItems = countData.Count;
    const totalPages = Math.ceil(totalItems / pageSize);

    // Fetch paginated products
    const getAllProductsParams = {
      TableName: process.env.PRODUCTS_TABLE,
      Limit: pageSize,
      ExclusiveStartKey: exclusiveStartKey,
    };



    const totalFilteredProducts = {
      TableName: process.env.PRODUCTS_TABLE,
  
  };
    const productsData = await dynamoDB.send(new ScanCommand(getAllProductsParams));
    const TotalProducts = await dynamoDB.send(new ScanCommand(totalFilteredProducts));



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
        QuantityUnits: 250, // Default to grams (250g)
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
          QuantityUnits: 250,
          Subtotal: 0,
          Price: 0,
          Mrp: 0,
          Quantity: 0,
          productImage: product.image || '',
          productName: product.name || ''
        };

        const cartItem = cartItemsMap.get(product.id) || defaultCartItem;
        console.log(cartItem)
        // Only add selectedQuantityUnit if the item is in the cart and is measured in grams
        if (cartItemsMap.has(product.id) && cartItem.QuantityUnits) {
          cartItem.selectedQuantityUnitprice = cartItem.Price;
          cartItem.selectedQuantityUnitMrp = cartItem.Mrp;

        } else {
          delete cartItem.selectedQuantityUnit;
        }

        return {
          ...product,
          inCart: cartItemsMap.has(product.id),
          inWishlist: wishlistItemsSet.has(product.id),
          cartItem,
        };
      });
    }

    // Encode the LastEvaluatedKey for pagination
    const encodedLastEvaluatedKey = productsData.LastEvaluatedKey 
      ? encodeURIComponent(Buffer.from(JSON.stringify(productsData.LastEvaluatedKey)).toString('base64'))
      : null;

    // Prepare the pagination response
    const response = {
      products: productsWithCartInfo,
      pagination: {
        currentPage: pageNumber,
        pageSize: pageSize,
        totalPages: totalPages,
        nextPage: encodedLastEvaluatedKey ? pageNumber + 1 : null,
        lastEvaluatedKey: encodedLastEvaluatedKey,
        // currentTotalProducts:products.length,
        TotalProducts: TotalProducts.Items.length
      },
    };

    // console.log("Pagination Response:", JSON.stringify(response, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(response), // Return the array of products with pagination info
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch products', error }),
    };
  }
};
