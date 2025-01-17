const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { v4: uuid } = require("uuid");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

// Cached products outside of handler
let cachedProducts = null;

module.exports.handler = async (event) => {
  try {
    const correlationId = uuid();
    const method = "list-products-cached.handler";
    const prefix = `${correlationId} - ${method}`;

    console.log(`${prefix} - started`);

    const userId = event.queryStringParameters?.userId;

    // Check if products are already cached
    if (!cachedProducts || !cachedProducts.items || cachedProducts.items.length === 0) {
      console.log(`${prefix} - no products cached, fetching from DB`);

      const scanParams = {
        TableName: process.env.PRODUCTS_TABLE,
        FilterExpression: '#availability = :trueValue',
        ExpressionAttributeNames: { '#availability': 'availability' },
        ExpressionAttributeValues: { ':trueValue': { BOOL: true } },
      };

      const productsData = await dynamoDB.send(new ScanCommand(scanParams));

      if (!productsData.Items || productsData.Items.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'No products found' }),
        };
      }

      const products = productsData.Items.map(item => unmarshall(item));
      cachedProducts = {
        items: products,
        responseDateTime: new Date().toUTCString(), // cache timestamp
      };
    } else {
      console.log(`${prefix} - products loaded from cache`);
    }

    const products = cachedProducts.items;

    console.log(products)

    // Fetch product details with cart and wishlist info
    const productsWithDetails = await fetchProductDetailsWithCartAndWishlistInfo(products, userId);

    const response = {
      products: productsWithDetails,
      cacheInfo: {
        cachedAt: cachedProducts.responseDateTime,
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
      body: JSON.stringify({ message: 'Failed to fetch products', error: error.message  }),
    };
  }
};

// Helper function to fetch product details with cart and wishlist info
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

        const defaultCartItem = {
          ProductId: product.id,
          UserId: userId || "defaultUserId",
          Savings: 0,
          QuantityUnits: 250, // Default to grams (250g)
          Subtotal: 0,
          Price: inventoryItem.unitPrices[0]?.price || 0,
          Mrp: inventoryItem.unitPrices[0]?.discountedPrice || 0,
          Quantity: 0,
          productImage: product.image || "",
          productName: product.name || "",
        };

        return {
          ...product,
          price: inventoryItem.unitPrices[0]?.price || 0,
          unitPrices: inventoryItem.unitPrices,
          mrp: inventoryItem.unitPrices[0]?.discountedPrice || 0,
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
    return products.map(product => {
      const productId = product.id;
      const cartItem = cartItemsMap.get(productId) || {
        ProductId: product.id,
        UserId: userId,
        Quantity: 0,
        Subtotal: 0,
        Price: product.price,
        Mrp: product.mrp,
      };

      return {
        ...product,
        inCart: cartItemsMap.has(productId),
        inWishlist: wishlistItemsSet.has(productId),
        cartItem,
      };
    });
  } catch (error) {
    console.error('Error fetching cart and wishlist info:', error);
    throw error;
  }
}
