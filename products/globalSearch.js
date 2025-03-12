// 'use strict';

// const AWS = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
// require('dotenv').config();

// const client = new AWS.DynamoDBClient();
// const docClient = DynamoDBDocumentClient.from(client);

// exports.handler = async (event) => {
//   const { query } = event.queryStringParameters || {};
//   const userId = event.queryStringParameters && event.queryStringParameters.userId;

//   if (!query) {
//     return {
//       statusCode: 400,
//       body: JSON.stringify({ message: "Query parameter is required" }),
//     };
//   }

//   const params = {
//     TableName: process.env.PRODUCTS_TABLE,
//     FilterExpression: "(contains(#search_name, :query) OR contains(#category, :query) OR contains(#subCategory, :query) OR contains(#description, :query)) AND #availability = :trueValue",
//     ExpressionAttributeNames: {
//       "#search_name": "search_name",  // Changed name field to search_name
//       "#category": "category",
//       "#subCategory": "subCategory",
//       "#description": "description",
//       "#availability": "availability"
//     },
//     ExpressionAttributeValues: {
//       ":query": query,
//       ":trueValue": true
//     }
//   };

//   try {
//     const data = await docClient.send(new ScanCommand(params));
//     const products = data.Items;

//     // For each product, fetch price, mrp, and unitPrices from the Inventory table
//     for (let product of products) {
//       const inventoryParams = {
//         TableName: process.env.INVENTORY_TABLE,
//         IndexName: "productIdIndex",  // Assuming GSI on Inventory table with productId
//         KeyConditionExpression: "productId = :productId",
//         ExpressionAttributeValues: {
//           ":productId": product.id,  // Using product id as key
//         },
//       };

//       const inventoryData = await docClient.send(new QueryCommand(inventoryParams));
//       const inventoryItem = inventoryData.Items && inventoryData.Items[0];  // Assuming single inventory item

//       if (inventoryItem) {
//         if (inventoryItem.unitPrices) {
//           product.price = inventoryItem.unitPrices[0].price || 0;
//           product.mrp = inventoryItem.unitPrices[0].discountedPrice || 0;
//           product.unitPrices = inventoryItem.unitPrices || [];
//         } else {
//           product.price = inventoryItem.onlineStorePrice || 0;
//           product.mrp = inventoryItem.compareAt || 0;
//           product.unitPrices = inventoryItem.unitPrices || [];
//         }
//       } else {
//         product.price = 0;
//         product.mrp = 0;
//         product.unitPrices = [];
//       }

//       // Convert qty to grams in unitPrices if required
//       if (product.unitPrices && product.unitPrices.length > 0) {
//         product.unitPrices = product.unitPrices.map(unitPrice => ({
//           ...unitPrice,
//           qty: unitPrice.qty,  // Adjust conversion logic here if needed
//         }));

//         // Set default selectedQuantityUnitPrice and mrp
//         product.selectedQuantityUnitPrice = product.unitPrices[0].price || 0;
//         product.mrp = product.unitPrices[0].discountedPrice || 0;
//       } else {
//         product.selectedQuantityUnitPrice = 0;
//         product.mrp = 0;
//       }
//     }

//     if (userId) {
//       // Fetch cart items for the user
//       const cartParams = {
//         TableName: process.env.CART_TABLE,
//         KeyConditionExpression: 'UserId = :userId',
//         ExpressionAttributeValues: {
//           ':userId': userId
//         }
//       };

//       const cartData = await docClient.send(new QueryCommand(cartParams));
//       const cartItems = cartData.Items;

//       // Fetch wishlist items for the user
//       const wishlistParams = {
//         TableName: process.env.WISHLIST_TABLE,
//         KeyConditionExpression: 'UserId = :userId',
//         ExpressionAttributeValues: {
//           ':userId': userId
//         }
//       };

//       const wishlistData = await docClient.send(new QueryCommand(wishlistParams));
//       const wishlistItems = wishlistData.Items;
//       const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

//       products.forEach(product => {
//         const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
//         const inWishlist = wishlistItemsSet.has(product.id);

//         if (cartItem) {
//           product.inCart = true;
//           product.savingsPercentage= product.savingsPercentage || 0,
//           product.cartItem = {
//             ...cartItem,
//             selectedQuantityUnit: cartItem.QuantityUnits,
//             selectedQuantityMrp: cartItem.Mrp,
//           };
//         } else {
//           product.inCart = false;
//           product.savingsPercentage= product.savingsPercentage || 0,

//           product.cartItem = {
//             ProductId: product.id,
//             UserId: userId,
//             Savings: 0,
//             QuantityUnits: 0,
//             Subtotal: 0,
//             Price: 0,
//             Mrp: product.mrp,
//             Quantity: 0,
//             productImage: product.image || '',
//             productName: product.name || '',
//           };
//         }

//         product.inWishlist = inWishlist;
//       });
//     } else {
//       products.forEach(product => {
//         product.savingsPercentage= product.savingsPercentage || 0,

//         product.inCart = false;
//         product.inWishlist = false;
//         product.cartItem = {
//           ProductId: product.id,
//           UserId: 'defaultUserId',
//           Savings: 0,
//           QuantityUnits: 0,
//           Subtotal: 0,
//           Price: 0,
//           Mrp: product.mrp,
//           Quantity: 0,
//           productImage: product.image || '',
//           productName: product.name || '',
//         };
//       });
//     }

//     return {
//       statusCode: 200,
//       body: JSON.stringify(products),
//     };
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
//     };
//   }
// };

'use strict';
const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const { query } = event.queryStringParameters || {};
  const userId = event.queryStringParameters && event.queryStringParameters.userId;

  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Query parameter is required" }),
    };
  }

  // Build the dynamic filter expression for the tags list (checking up to 10 tags)
  const tagFilterExpression = Array(10).fill(0).map((_, i) => `contains(#tags[${i}], :query)`).join(' OR ');

  const params = {
    TableName: process.env.PRODUCTS_TABLE,
    FilterExpression: `(contains(#search_name, :query) OR contains(#category, :query) OR contains(#subCategory, :query) OR contains(#description, :query) OR ${tagFilterExpression}) AND #availability = :trueValue`,
    ExpressionAttributeNames: {
      "#search_name": "search_name",
      "#category": "category",
      "#subCategory": "subCategory",
      "#description": "description",
      "#tags": "tags",  // This is for the 'tags' list
      "#availability": "availability"
    },
    ExpressionAttributeValues: {
      ":query": query.toLowerCase(),  // Convert query to lowercase for case-insensitive search
      ":trueValue": true
    }
  };

  try {
    const data = await docClient.send(new ScanCommand(params));
    var products = data.Items;
    products = products.map(product => ({
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
      mrp: product.comparePrice,
      unit: product.unit || '',
  }));

    // For each product, fetch price, mrp, and unitPrices from the Inventory table
    // for (let product of products) {
    //   const inventoryParams = {
    //     TableName: process.env.INVENTORY_TABLE,
    //     IndexName: "productIdIndex",  // Assuming GSI on Inventory table with productId
    //     KeyConditionExpression: "productId = :productId",
    //     ExpressionAttributeValues: {
    //       ":productId": product.id,  // Using product id as key
    //     },
    //   };

    //   const inventoryData = await docClient.send(new QueryCommand(inventoryParams));
    //   const inventoryItem = inventoryData.Items && inventoryData.Items[0];  // Assuming single inventory item

    //   if (inventoryItem) {
    //     if (inventoryItem.unitPrices) {
    //       product.price = inventoryItem.unitPrices[0].price || 0;
    //       product.mrp = inventoryItem.unitPrices[0].mrp || 0;
    //       product.unitPrices = inventoryItem.unitPrices || [];
    //     } else {
    //       product.price = inventoryItem.onlineStorePrice || 0;
    //       product.mrp = inventoryItem.compareAt || 0;
    //       product.unitPrices = inventoryItem.unitPrices || [];
    //     }
    //   } else {
    //     product.price = 0;
    //     product.mrp = 0;
    //     product.unitPrices = [];
    //   }

    //   // Convert qty to grams in unitPrices if required
    //   if (product.unitPrices && product.unitPrices.length > 0) {
    //     product.unitPrices = product.unitPrices.map(unitPrice => ({
    //       ...unitPrice,
    //       qty: unitPrice.qty,  // Adjust conversion logic here if needed
    //     }));

    //     // Set default selectedQuantityUnitPrice and mrp
    //     product.selectedQuantityUnitPrice = product.unitPrices[0].price || 0;
    //     product.mrp = product.unitPrices[0].mrp || 0;
    //   } else {
    //     product.selectedQuantityUnitPrice = 0;
    //     product.mrp = 0;
    //   }
    // }

    if (userId) {
      // Fetch cart items for the user
      const cartParams = {
        TableName: process.env.CART_TABLE,
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const cartData = await docClient.send(new QueryCommand(cartParams));
      const cartItems = cartData.Items;

      // Fetch wishlist items for the user
      const wishlistParams = {
        TableName: process.env.WISHLIST_TABLE,
        KeyConditionExpression: 'UserId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const wishlistData = await docClient.send(new QueryCommand(wishlistParams));
      const wishlistItems = wishlistData.Items;
      const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

      products.forEach(product => {
        const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
        const inWishlist = wishlistItemsSet.has(product.id);

        if (cartItem) {
          product.inCart = true;
          product.savingsPercentage = product.savingsPercentage || 0;
          product.cartItem = {
            ...cartItem,
            selectedQuantityUnit: cartItem.QuantityUnits,
            selectedQuantityMrp: cartItem.Mrp,
          };
        } else {
          product.inCart = false;
          product.savingsPercentage = product.savingsPercentage || 0;
          product.cartItem = {
            ProductId: product.id,
            UserId: userId,
            Savings: 0,
            QuantityUnits: 0,
            Subtotal: 0,
            Price: 0,
            Mrp: product.mrp,
            Quantity: 0,
            productImage: product.image || '',
            productName: product.name || '',
          };
        }

        product.inWishlist = inWishlist;
      });
    } else {
      products.forEach(product => {
        product.savingsPercentage = product.savingsPercentage || 0;

        product.inCart = false;
        product.inWishlist = false;
        product.cartItem = {
          ProductId: product.id,
          UserId: 'defaultUserId',
          Savings: 0,
          QuantityUnits: 0,
          Subtotal: 0,
          Price: 0,
          Mrp: product.mrp,
          Quantity: 0,
          productImage: product.image || '',
          productName: product.name || '',
        };
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
