// const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
// const { unmarshall } = require("@aws-sdk/util-dynamodb");
// require('dotenv').config();

// const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

// module.exports.handler = async (event) => {
//   try {
//     const userId = event.queryStringParameters && event.queryStringParameters.userId;
//     const pageNumber = parseInt(event.queryStringParameters.pageNumber) || 1;
//     const pageSize = parseInt(event.queryStringParameters.pageSize) || 10;
//     const exclusiveStartKeyParam = event.queryStringParameters.exclusiveStartKey;
//     const exclusiveStartKey = exclusiveStartKeyParam
//       ? JSON.parse(Buffer.from(decodeURIComponent(exclusiveStartKeyParam), 'base64').toString('utf8'))
//       : undefined;

//     console.log("Exclusive Start Key:", JSON.stringify(exclusiveStartKey, null, 2));

//     // Fetch total item count
//     const countParams = {
//       TableName: process.env.PRODUCTS_TABLE,
//       Select: "COUNT",
//     };
//     const countData = await dynamoDB.send(new ScanCommand(countParams));
//     const totalItems = countData.Count;
//     const totalPages = Math.ceil(totalItems / pageSize);

//     // Fetch paginated products
//     const getAllProductsParams = {
//       TableName: process.env.PRODUCTS_TABLE,
//       Limit: pageSize,
//       ExclusiveStartKey: exclusiveStartKey,
//     };



//     const totalFilteredProducts = {
//       TableName: process.env.PRODUCTS_TABLE,

//     };

//     // console.log(getAllProductsParams)
//     const productsData = await dynamoDB.send(new ScanCommand(getAllProductsParams));

//     // console.log(productsData)
//     const TotalProducts = await dynamoDB.send(new ScanCommand(totalFilteredProducts));



//     if (!productsData.Items || productsData.Items.length === 0) {
//       return {
//         statusCode: 404,
//         body: JSON.stringify({ message: 'No products found' }),
//       };
//     }

//     let products = productsData.Items.map(item => unmarshall(item));

//     // Convert qty to grams
//     products = products.map(product => {
//       if (product.unitPrices) {
//         product.unitPrices = product.unitPrices.map(unitPrice => ({
//           ...unitPrice,
//           qty: unitPrice.qty
//         }));
//       }
//       return product;
//     });

//     let productsWithCartInfo =  products.map(product => {


//       const params = {
//         TableName: 'inventory',
//         Key: {
//           productId: productId
//         }
//       };
//       const inventoryData = await dynamoDB.send(new ScanCommand(getAllProductsParams));


//       const defaultCartItem = {
//         ProductId: product.id,
//         UserId: userId || 'defaultUserId', // Assign a default userId if not provided
//         Savings: 0,
//         QuantityUnits: 250, // Default to grams (250g)
//         Subtotal: 0,
//         Price: 0,
//         Mrp: 0,
//         Quantity: 0,
//         productImage: product.image || '',
//         productName: product.name || ''
//       };


//       return {
//         // ...product,
//         unit: product.unit,
//         image: product.image,
//         category: product.category,
//         images: product.images,
//         description: product.description,
//         id: product.id,
//         name: product.name,
//         availability: product.availability,
//         price: product.price || 0,
//         mrp: product.mrp || 0,
//         inCart: false,
//         inWishlist: false, // Default value for wishlist status
//         cartItem: defaultCartItem,
//       };
//     });

//     if (userId) {
//       // Fetch cart items for the user
//       const getCartItemsParams = {
//         TableName: 'CartItems',
//         KeyConditionExpression: 'UserId = :userId',
//         ExpressionAttributeValues: {
//           ':userId': { S: userId },
//         },
//       };
//       const cartData = await dynamoDB.send(new QueryCommand(getCartItemsParams));
//       const cartItemsMap = new Map();

//       // Map cart items by ProductId for easy lookup
//       if (cartData.Items) {
//         cartData.Items.map(item => unmarshall(item)).forEach(item => {
//           cartItemsMap.set(item.ProductId, item);
//         });
//       }

//       // Fetch wishlist items for the user
//       const getWishlistItemsParams = {
//         TableName: 'ProductWishLists',
//         KeyConditionExpression: 'UserId = :userId',
//         ExpressionAttributeValues: {
//           ':userId': { S: userId },
//         },
//       };
//       const wishlistData = await dynamoDB.send(new QueryCommand(getWishlistItemsParams));
//       const wishlistItemsSet = new Set();

//       // Map wishlist items by ProductId for easy lookup
//       if (wishlistData.Items) {
//         wishlistData.Items.map(item => unmarshall(item)).forEach(item => {
//           wishlistItemsSet.add(item.ProductId);
//         });
//       }

//       // Merge cart and wishlist items with products
//       productsWithCartInfo = productsWithCartInfo.map(product => {
//         const defaultCartItem = {
//           ProductId: product.id,
//           UserId: userId,
//           Savings: 0,
//           QuantityUnits: 250,
//           Subtotal: 0,
//           Price: 0,
//           Mrp: 0,
//           Quantity: 0,
//           productImage: product.image || '',
//           productName: product.name || ''
//         };

//         const cartItem = cartItemsMap.get(product.id) || defaultCartItem;
//         // console.log(cartItem)
//         // Only add selectedQuantityUnit if the item is in the cart and is measured in grams
//         if (cartItemsMap.has(product.id) && cartItem.QuantityUnits) {
//           cartItem.selectedQuantityUnitprice = cartItem.Price;
//           cartItem.selectedQuantityUnitMrp = cartItem.Mrp;

//         } else {
//           delete cartItem.selectedQuantityUnit;
//         }
//         // console.log(product)
//         return {
//           // ...product,
//           unit: product.unit,
//           image: product.image,
//           category: product.category,
//           images: product.images,
//           description: product.description,
//           id: product.id,
//           name: product.name,
//           availability: product.availability,
//           price: product.price || 0,
//           mrp: product.mrp || 0,
//           inCart: cartItemsMap.has(product.id),
//           inWishlist: wishlistItemsSet.has(product.id),
//           cartItem,
//         };
//       });
//     }

//     // Encode the LastEvaluatedKey for pagination
//     const encodedLastEvaluatedKey = productsData.LastEvaluatedKey
//       ? encodeURIComponent(Buffer.from(JSON.stringify(productsData.LastEvaluatedKey)).toString('base64'))
//       : null;

//     // Prepare the pagination response
//     const response = {
//       products: productsWithCartInfo,
//       pagination: {
//         currentPage: pageNumber,
//         pageSize: pageSize,
//         totalPages: totalPages,
//         nextPage: encodedLastEvaluatedKey ? pageNumber + 1 : null,
//         lastEvaluatedKey: encodedLastEvaluatedKey,
//         // currentTotalProducts:products.length,
//         TotalProducts: TotalProducts.Items.length
//       },
//     };

//     console.log("Pagination Response:", JSON.stringify(response, null, 2));

//     return {
//       statusCode: 200,
//       body: JSON.stringify(response), // Return the array of products with pagination info
//     };
//   } catch (error) {
//     console.error('Error fetching products:', error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: 'Failed to fetch products', error }),
//     };
//   }
// };



// async function getProductsWithCartInfo(products, userId) {
//   const productsWithCartInfo = await Promise.all(
//     products.map(async (product) => {
//       const productId = product.id;

//       // DynamoDB GetCommand to get specific product details from inventory table
//       const params = {
//         TableName: "inventory",
//         Key: {
//           productId: productId,
//         },
//       };

//       try {
//         // Fetch the inventory data using the GetCommand
//         const inventoryData = await dynamoDB.send(new GetCommand(params));

//         // Default values for cart item
//         const defaultCartItem = {
//           ProductId: product.id,
//           UserId: userId || "defaultUserId", // Assign a default userId if not provided
//           Savings: 0,
//           QuantityUnits: 250, // Default to grams (250g)
//           Subtotal: 0,
//           Price: inventoryData.Item ? inventoryData.Item.price || 0 : 0,
//           Mrp: inventoryData.Item ? inventoryData.Item.mrp || 0 : 0,
//           Quantity: 0,
//           productImage: product.image || "",
//           productName: product.name || "",
//         };

//         // Returning product information along with cart details
//         return {
//           unit: product.unit,
//           image: product.image,
//           category: product.category,
//           images: product.images,
//           description: product.description,
//           id: product.id,
//           name: product.name,
//           availability: product.availability,
//           price: product.price || 0,
//           mrp: product.mrp || 0,
//           inCart: false,
//           inWishlist: false, // Default value for wishlist status
//           cartItem: defaultCartItem,
//         };
//       } catch (error) {
//         console.error("Error fetching inventory data:", error);
//         throw new Error("Failed to fetch product inventory");
//       }
//     })
//   );

//   return productsWithCartInfo;
// }

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
      FilterExpression: '#availability = :trueValue',
      ExpressionAttributeNames: {
        '#availability': 'availability',
      },
      ExpressionAttributeValues: {
        ':trueValue': { BOOL: true }, // Adjust this according to the AWS SDK v3 format
      },
    };
    const productsData = await dynamoDB.send(new ScanCommand(getAllProductsParams));

    if (!productsData.Items || productsData.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No products found' }),
      };
    }

    let products = productsData.Items.map(item => unmarshall(item));
    // products = products.filter(product => product.availability === true);

    console.log("Filtered Products:", JSON.stringify(products, null, 2));

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

    let productsWithCartInfo = await getProductsWithCartInfo(products, userId);

    if (userId) {
      productsWithCartInfo = await fetchCartAndWishlistInfo(productsWithCartInfo, userId);
    }

    // console.log("Products with Cart and Wishlist Info:", JSON.stringify(productsWithCartInfo, null, 2));

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
        TotalProducts: totalItems
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
      body: JSON.stringify({ message: 'Failed to fetch products', error }),
    };
  }
};

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
          Price: inventoryItem.onlineStorePrice || 0,
          Mrp: inventoryItem.compareAt || 0,
          Quantity: 0,
          productImage: product.image || "",
          productName: product.name || "",
        };

        return {
          unit: product.unit,
          image: product.image,
          category: product.category,
          images: product.images,
          description: product.description,
          id: product.id,
          name: product.name,
          availability: product.availability,
          price: inventoryItem.unitPrices[0].price || 0,
          unitPrices: inventoryItem.unitPrices,
          mrp: inventoryItem.unitPrices[0].mrp|| 0,
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
      TableName: 'CartItems',
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
      TableName: 'ProductWishLists',
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

        console.log(inventoryItem)

        return {
          unit: product.unit,
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
    console.error("Error fetching cart and wishlist data:", error);
    throw new Error("Failed to fetch cart and wishlist data");
  }
}
