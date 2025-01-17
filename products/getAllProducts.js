const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {
  try {
    const userId = event.queryStringParameters && event.queryStringParameters.userId;
    const pageNumber = event.queryStringParameters && event.queryStringParameters.pageNumber
      ? parseInt(event.queryStringParameters.pageNumber)
      : null;
    const pageSize = event.queryStringParameters && event.queryStringParameters.pageSize
      ? parseInt(event.queryStringParameters.pageSize)
      : null;

    // Fetch all products with a filter for availability
    const scanParams = {
      TableName: process.env.PRODUCTS_TABLE,
      FilterExpression: '#availability = :trueValue',
      ExpressionAttributeNames: {
        '#availability': 'availability',
      },
      ExpressionAttributeValues: {
        ':trueValue': { BOOL: true },
      },
    };

    const productsData = await dynamoDB.send(new ScanCommand(scanParams));
    
    if (!productsData.Items || productsData.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No products found' }),
      };
    }

    let products = productsData.Items.map(item => unmarshall(item));

    // If pagination parameters are provided, calculate pagination
    if (pageNumber && pageSize) {
      const totalItems = products.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (pageNumber - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      products = products.slice(startIndex, endIndex);

      const response = {
        products: await fetchProductDetailsWithCartAndWishlistInfo(products, userId),
        pagination: {
          currentPage: pageNumber,
          pageSize,
          totalPages,
          nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
          totalProducts: totalItems,
        },
      };
      
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    } else {
      // If no pagination, return all products without pagination data
      const productsWithCartInfo = await fetchProductDetailsWithCartAndWishlistInfo(products, userId);

      return {
        statusCode: 200,
        body: JSON.stringify({ products: productsWithCartInfo }),
      };
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch products', error }),
    };
  }
};

async function fetchProductDetailsWithCartAndWishlistInfo(products, userId) {
  let productsWithCartInfo = await getProductsWithCartInfo(products, userId);

  if (userId) {
    productsWithCartInfo = await fetchCartAndWishlistInfo(productsWithCartInfo, userId);
  }

  return productsWithCartInfo;
}

async function getProductsWithCartInfo(products, userId) {
  return Promise.all(
    products.map(async (product) => {
      const productId = product.id;

      if (!productId) {
        throw new Error("Invalid productId: productId is null or undefined");
      }

      const params = {
        TableName: process.env.INVENTORY_TABLE,
        IndexName: "productIdIndex", // Replace with your actual GSI name
        KeyConditionExpression: "productId = :productId",
        ExpressionAttributeValues: {
          ":productId": { S: productId },
        },
      };

      try {
        const inventoryData = await dynamoDB.send(new QueryCommand(params));
        console.log("Inventory Data for Product ID", productId, ":", JSON.stringify(inventoryData, null, 2));

        if (!inventoryData.Items || inventoryData.Items.length === 0) {
          throw new Error("Product not found in inventory");
        }

        const inventoryItem = unmarshall(inventoryData.Items[0]);

        if (!inventoryItem.unitPrices || inventoryItem.unitPrices.length === 0 || !inventoryItem.unitPrices[0].price) {
          console.log(`Price not available for productId: ${productId}`);

        }
        const defaultCartItem = {
          ProductId: product.id,
          UserId: userId || "defaultUserId",
          Savings: 0,
          QuantityUnits: 250, // Default to grams (250g)
          Subtotal: 0,
          Price: inventoryItem.onlineStorePrice || 0,
          Mrp: inventoryItem.compareAt || 0,
          Quantity: 0,
          productImage: product.image || "",
          productName: product.name || "",
        };

        return {
          unit: product.unit,
          savingsPercentage: product.savingsPercentage || 0,
          image: product.image,
          category: product.category,
          images: product.images,
          description: product.description,
          id: product.id,
          name: product.name,
          availability: product.availability,
          price: inventoryItem.unitPrices[0].price || 0,
          unitPrices: inventoryItem.unitPrices,
          mrp: inventoryItem.unitPrices[0].mrp || 0,
          inCart: false,
          inWishlist: false,
          cartItem: defaultCartItem,
        };
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        throw new Error("Failed to fetch product inventory");
      }
    })
  );
}

async function fetchCartAndWishlistInfo(products, userId) {
  try {
    // Fetch cart items for the user
    const getCartItemsParams = {
      TableName: process.env.CART_TABLE,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
    };
    const cartData = await dynamoDB.send(new QueryCommand(getCartItemsParams));
    const cartItemsMap = new Map();

    if (cartData.Items) {
      cartData.Items.map(item => unmarshall(item)).forEach(item => {
        cartItemsMap.set(item.ProductId, item);
      });
    }

    console.log("Cart Items Map:", JSON.stringify(Array.from(cartItemsMap.entries()), null, 2));

    // Fetch wishlist items for the user
    const getWishlistItemsParams = {
      TableName: process.env.WISHLIST_TABLE,
      KeyConditionExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
      },
    };
    const wishlistData = await dynamoDB.send(new QueryCommand(getWishlistItemsParams));
    const wishlistItemsSet = new Set();

    if (wishlistData.Items) {
      wishlistData.Items.map(item => unmarshall(item)).forEach(item => {
        wishlistItemsSet.add(item.ProductId);
      });
    }

    console.log("Wishlist Items Set:", JSON.stringify(Array.from(wishlistItemsSet), null, 2));

    // Merge cart and wishlist items with products
    return Promise.all(products.map(async (product) => {
      const productId = product.id;
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

      const cartItem = cartItemsMap.get(productId) || defaultCartItem;

      if (cartItemsMap.has(productId) && cartItem.QuantityUnits) {
        cartItem.selectedQuantityUnitprice = cartItem.Price;
        cartItem.selectedQuantityUnitMrp = cartItem.Mrp;
      } else {
        delete cartItem.selectedQuantityUnit;
      }

      const params = {
        TableName: process.env.INVENTORY_TABLE,
        IndexName: "productIdIndex", // Replace with your actual GSI name
        KeyConditionExpression: "productId = :productId",
        ExpressionAttributeValues: {
          ":productId": { S: productId },
        },
      };

      try {
        const inventoryData = await dynamoDB.send(new QueryCommand(params));
        const inventoryItem = (inventoryData.Items && inventoryData.Items.length > 0) ? unmarshall(inventoryData.Items[0]) : {};

        return {
          unit: product.unit,
          savingsPercentage: product.savingsPercentage || 0,
          image: product.image,
          category: product.category,
          images: product.images,
          description: product.description,
          id: product.id,
          name: product.name,
          availability: product.availability,
          price: inventoryItem.unitPrices[0].price || 0,
          unitPrices: inventoryItem.unitPrices,
          mrp: inventoryItem.unitPrices[0].mrp || 0,
          inCart: cartItemsMap.has(productId),
          inWishlist: wishlistItemsSet.has(productId),
          cartItem,
        };
      } catch (error) {
        console.error("Error fetching inventory data:", error);
        throw new Error("Failed to fetch product inventory");
      }
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Failed to fetch products, default response.', error: error.message }),
    };
  }
}
