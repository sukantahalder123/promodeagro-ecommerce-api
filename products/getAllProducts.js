const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require("dotenv").config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

module.exports.handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId || null;
    const pageNumber = parseInt(event.queryStringParameters?.pageNumber) || null;
    const pageSize = parseInt(event.queryStringParameters?.pageSize) || null;

    // Fetch all products with a filter for availability
    const scanParams = {
      TableName: process.env.PRODUCTS_TABLE,
      // FilterExpression: "#availability = :trueValue",
      // ExpressionAttributeNames: {
      //   "#availability": "availability",
      // },
      // ExpressionAttributeValues: {
      //   ":trueValue": { BOOL: true },
      // },
    };

    const productsData = await dynamoDB.send(new ScanCommand(scanParams));

    if (!productsData.Items || productsData.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No products found" }),
      };
    }

    let products = productsData.Items.map(item => formatProduct(unmarshall(item), userId));

    if (pageNumber && pageSize) {
      const totalItems = products.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (pageNumber - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      products = products.slice(startIndex, endIndex);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          products: await fetchCartAndWishlistInfo(products, userId),
          pagination: {
            currentPage: pageNumber,
            pageSize,
            totalPages,
            nextPage: pageNumber < totalPages ? pageNumber + 1 : null,
            totalProducts: totalItems,
          },
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ products: await fetchCartAndWishlistInfo(products, userId) }),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch products", error }),
    };
  }
};

async function fetchCartAndWishlistInfo(products, userId) {
  if (!userId) return products;

  try {
    const cartData = await dynamoDB.send(new QueryCommand({
      TableName: process.env.CART_TABLE,
      KeyConditionExpression: "UserId = :userId",
      ExpressionAttributeValues: { ":userId": { S: userId } },
    }));
    
    const cartItemsMap = new Map();
    if (cartData.Items) {
      cartData.Items.map(item => unmarshall(item)).forEach(item => {
        cartItemsMap.set(item.ProductId, item);
      });
    }
    
    const wishlistData = await dynamoDB.send(new QueryCommand({
      TableName: process.env.WISHLIST_TABLE,
      KeyConditionExpression: "UserId = :userId",
      ExpressionAttributeValues: { ":userId": { S: userId } },
    }));

    const wishlistItemsSet = new Set();
    if (wishlistData.Items) {
      wishlistData.Items.map(item => unmarshall(item)).forEach(item => {
        wishlistItemsSet.add(item.ProductId);
      });
    }
    
    return products.map(product => {
      const productId = product.id;
      const cartItem = cartItemsMap.get(productId) || {
        ProductId: productId,
        UserId: userId,
        Savings: product.savingsPercentage || 0,
        QuantityUnits: 250, // Default to grams (250g)
        Subtotal: 0,
        Price: product.price || 0,
        Mrp: product.mrp || 0,
        Quantity: 0,
        // status:product.availability,
        productImage: product.image || "",
        productName: product.name || "",
      };

      return {
        ...product,
        inCart: cartItemsMap.has(productId),
        inWishlist: wishlistItemsSet.has(productId),
        cartItem,
      };
    });
  } catch (error) {
    console.error("Error fetching cart and wishlist info:", error);
    return products;
  }
}

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

module.exports.formatProduct = formatProduct;
