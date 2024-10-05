// 'use strict';

// const AWS = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
// require('dotenv').config();

// const client = new AWS.DynamoDBClient();
// const docClient = DynamoDBDocumentClient.from(client);

// exports.handler = async (event) => {
//     const { minPrice, maxPrice, discounts, userId, ratingFilter, category, subcategory } = event.queryStringParameters || {};


//     const pageNumber = parseInt(event.queryStringParameters.pageNumber) || 1;
//     const pageSize = parseInt(event.queryStringParameters.pageSize) || 10;
//     const exclusiveStartKeyParam = event.queryStringParameters.exclusiveStartKey;
//     const exclusiveStartKey = exclusiveStartKeyParam
//         ? JSON.parse(Buffer.from(decodeURIComponent(exclusiveStartKeyParam), 'base64').toString('utf8'))
//         : undefined;

//     console.log("Exclusive Start Key:", JSON.stringify(exclusiveStartKey, null, 2));

//     // Define parameters for querying the Reviews table
//     const reviewsParams = {
//         TableName: 'UserReviews',
//         ProjectionExpression: 'productId, rating'
//     };

//     // Define parameters for querying the Products table
//     const productsParams = {
//         TableName: process.env.PRODUCTS_TABLE,
//         ProjectionExpression: 'id, price, savingsPercentage, unitPrices, image, #name, category, subcategory',
//         FilterExpression: '',
//         ExpressionAttributeValues: {},
//         ExpressionAttributeNames: {
//             '#name': 'name'
//         },
//         Limit: pageSize,
//         ExclusiveStartKey: exclusiveStartKey,
//     };

//     let filterExpression = '';
//     const expressionAttributeValues = {};

//     // Price range filter
//     if (minPrice && maxPrice) {
//         filterExpression += '#price BETWEEN :minPrice AND :maxPrice';
//         expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
//         expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
//         productsParams.ExpressionAttributeNames['#price'] = 'price';
//     } else if (minPrice) {
//         filterExpression += '#price >= :minPrice';
//         expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
//         productsParams.ExpressionAttributeNames['#price'] = 'price';
//     } else if (maxPrice) {
//         filterExpression += '#price <= :maxPrice';
//         expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
//         productsParams.ExpressionAttributeNames['#price'] = 'price';
//     }

//     // Discount filter
//     if (discounts) {
//         const discountRanges = {
//             'upto5': [0, 5],
//             '10to15': [10, 15],
//             '15to25': [15, 25],
//             'morethan25': [25, Number.MAX_SAFE_INTEGER]
//         };

//         const labels = discounts.split(',');
//         if (Array.isArray(labels) && labels.length > 0) {
//             if (filterExpression.length > 0) {
//                 filterExpression += ' AND (';
//             } else {
//                 filterExpression += '(';
//             }
//             for (let i = 0; i < labels.length; i++) {
//                 const label = labels[i].trim().toLowerCase();
//                 if (discountRanges[label]) {
//                     const [minDiscountValue, maxDiscountValue] = discountRanges[label];
//                     const minDiscountKey = `:minDiscount${i}`;
//                     const maxDiscountKey = `:maxDiscount${i}`;

//                     if (i > 0) {
//                         filterExpression += ' OR ';
//                     }
//                     filterExpression += `#savingsPercentage BETWEEN ${minDiscountKey} AND ${maxDiscountKey}`;

//                     expressionAttributeValues[minDiscountKey] = minDiscountValue;
//                     expressionAttributeValues[maxDiscountKey] = maxDiscountValue;
//                 }
//             }
//             filterExpression += ')';
//             productsParams.ExpressionAttributeNames['#savingsPercentage'] = 'savingsPercentage';
//         }
//     }

//     // Rating filter
//     let productIdsForRatingFilter = [];
//     if (ratingFilter) {
//         const ratingRanges = {
//             '5.0': [5, 5],
//             '4.0toup': [4, 5],
//             '3.0toup': [3, 5],
//             '2.0toup': [2, 5]
//         };

//         const ratingFilters = ratingFilter.split(',');
//         const filteredProductIds = new Set();

//         for (const rating of ratingFilters) {
//             const ratingRange = ratingRanges[rating.trim()];
//             if (ratingRange) {
//                 reviewsParams.FilterExpression = '#rating BETWEEN :minRating AND :maxRating';
//                 reviewsParams.ExpressionAttributeValues = {
//                     ':minRating': ratingRange[0],
//                     ':maxRating': ratingRange[1]
//                 };
//                 reviewsParams.ExpressionAttributeNames = {
//                     '#rating': 'rating'
//                 };

//                 try {
//                     const reviewsData = await docClient.send(new ScanCommand(reviewsParams));
//                     const reviews = reviewsData.Items;

//                     for (const review of reviews) {
//                         filteredProductIds.add(review.productId);
//                     }
//                 } catch (error) {
//                     console.error('Error fetching reviews:', error);
//                     return {
//                         statusCode: 500,
//                         body: JSON.stringify({ error: 'Failed to fetch reviews' })
//                     };
//                 }
//             }
//         }

//         productIdsForRatingFilter = Array.from(filteredProductIds);
//         if (productIdsForRatingFilter.length > 0) {
//             if (filterExpression.length > 0) {
//                 filterExpression += ' AND ';
//             }

//             const idFilters = productIdsForRatingFilter.map((id, index) => `:productId${index}`).join(', ');
//             filterExpression += `#id IN (${idFilters})`;
//             productIdsForRatingFilter.forEach((id, index) => {
//                 expressionAttributeValues[`:productId${index}`] = id;
//             });
//             productsParams.ExpressionAttributeNames['#id'] = 'id';
//         }
//     }

//     // Category and Subcategory filter
//     if (category) {
//         if (filterExpression.length > 0) {
//             filterExpression += ' AND ';
//         }
//         filterExpression += '#category = :category';
//         expressionAttributeValues[':category'] = category;
//         productsParams.ExpressionAttributeNames['#category'] = 'category';
//     }

//     if (subcategory) {
//         if (filterExpression.length > 0) {
//             filterExpression += ' AND ';
//         }
//         filterExpression += '#subCategory = :subcategory';
//         expressionAttributeValues[':subcategory'] = subcategory;
//         productsParams.ExpressionAttributeNames['#subCategory'] = 'subCategory';
//     }

//     // Adding the filter expression and attribute values to the productsParams
//     if (filterExpression.length > 0) {
//         productsParams.FilterExpression = filterExpression;
//         productsParams.ExpressionAttributeValues = expressionAttributeValues;
//     }

//     // Query Products using Scan with filters
//     try {

//         const totalFilteredProducts = {
//             TableName: process.env.PRODUCTS_TABLE,
//             ProjectionExpression: 'id, price, savingsPercentage, unitPrices, image, #name, category, subcategory',
//             FilterExpression: productsParams.filterExpression,
//             ExpressionAttributeValues: productsParams.expressionAttributeValues,
//             ExpressionAttributeNames: {
//                 '#name': 'name'
//             },
//             // Limit: pageSize,
//             // ExclusiveStartKey: exclusiveStartKey,
//         };

        

//         const productsData = await docClient.send(new ScanCommand(productsParams));
//         const TotalProducts = await docClient.send(new ScanCommand(totalFilteredProducts));


//         console.log(TotalProducts.Items.length)
//         // console.log(productsData)
//         const products = productsData.Items;

//         // Convert qty to grams in unitPrices
//         products.forEach(product => {
//             if (product.unitPrices) {
//                 product.unitPrices = product.unitPrices.map(unitPrice => ({
//                     ...unitPrice,
//                     qty: unitPrice.qty
//                 }));
//             }
//         });

//         // Fetch cart items for the user if userId is provided
//         if (userId) {
//             const cartParams = {
//                 TableName: 'CartItems',
//                 KeyConditionExpression: 'UserId = :userId',
//                 ExpressionAttributeValues: {
//                     ':userId': userId
//                 }
//             };

//             const cartData = await docClient.send(new QueryCommand(cartParams));
//             const cartItems = cartData.Items;

//             // Fetch wishlist items for the user if userId is provided
//             const wishlistParams = {
//                 TableName: 'ProductWishLists',
//                 KeyConditionExpression: 'UserId = :userId',
//                 ExpressionAttributeValues: {
//                     ':userId': userId
//                 }
//             };

//             const wishlistData = await docClient.send(new QueryCommand(wishlistParams));
//             const wishlistItems = wishlistData.Items;
//             const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

//             // Attach cart and wishlist information to products
//             products.forEach(product => {
//                 const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
//                 const inWishlist = wishlistItemsSet.has(product.id);

//                 if (cartItem) {
//                     product.inCart = true;
//                     product.cartItem = cartItem;
//                 } else {
//                     product.inCart = false;
//                     product.cartItem = {
//                         ProductId: product.id,
//                         UserId: userId,
//                         Savings: 0,
//                         QuantityUnits: 0,
//                         Subtotal: 0,
//                         Price: 0,
//                         Mrp: 0,
//                         Quantity: 0,
//                         productImage: product.image || '',
//                         productName: product.name || ''
//                     };
//                 }

//                 product.inWishlist = inWishlist;
//             });
//         } else {
//             products.forEach(product => {
//                 product.inCart = false;
//                 product.inWishlist = false;
//                 product.cartItem = {
//                     ProductId: product.id,
//                     UserId: 'defaultUserId',
//                     Savings: 0,
//                     QuantityUnits: 0,
//                     Subtotal: 0,
//                     Price: 0,
//                     Mrp: 0,
//                     Quantity: 0,
//                     productImage: product.image || '',
//                     productName: product.name || ''
//                 };
//             });
//         }

//         // Encode the LastEvaluatedKey for pagination
//         const encodedLastEvaluatedKey = productsData.LastEvaluatedKey
//             ? encodeURIComponent(Buffer.from(JSON.stringify(productsData.LastEvaluatedKey)).toString('base64'))
//             : null;

//         // Prepare the pagination response
//         const response = {
//             products: products,
//             pagination: {
//                 currentPage: pageNumber,
//                 pageSize: pageSize,
//                 currentTotalProducts:products.length,
//                 nextPage: encodedLastEvaluatedKey ? pageNumber + 1 : null,
//                 lastEvaluatedKey: encodedLastEvaluatedKey,
//                 TotalProducts:TotalProducts.Items.length
//             },
//         };


//         return {
//             statusCode: 200,
//             body: JSON.stringify(response),
//         };
//     } catch (error) {
//         console.error('Error fetching products:', error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ error: error.message }),
//         };
//     }
// };
'use strict';

const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const { discounts, userId, category, subcategory } = event.queryStringParameters || {};
    let { minPrice, maxPrice } = event.queryStringParameters || {};

    const pageNumber = parseInt(event.queryStringParameters.pageNumber) || 1;
    const pageSize = parseInt(event.queryStringParameters.pageSize) || 10;

    // Step 1: Query Inventory table for price details
    const inventoryParams = {
        TableName: process.env.INVENTORY_TABLE,
        ProjectionExpression: 'productId, onlineStorePrice, unitPrices' // Include unitPrices
    };

    let inventoryItems = [];
    try {
        const inventoryData = await docClient.send(new ScanCommand(inventoryParams));
        inventoryItems = inventoryData.Items;
    } catch (error) {
        console.error('Error fetching prices from inventory:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch prices from inventory' }),
        };
    }

    // Step 2: Filter inventory items by price range if provided
    if (minPrice || maxPrice) {
        minPrice = parseFloat(minPrice) || 0;
        maxPrice = parseFloat(maxPrice) || Number.MAX_SAFE_INTEGER;
        inventoryItems = inventoryItems.filter(item => {
            const price = parseFloat(item.onlineStorePrice);
            return price >= minPrice && price <= maxPrice;
        });
    }

    // Step 3: Extract product IDs that match the price range
    const productIds = inventoryItems.map(item => item.productId);

    if (productIds.length === 0) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                products: [],
                pagination: {
                    currentPage: pageNumber,
                    pageSize: pageSize,
                    TotalProducts: 0,
                    totalPages: 0
                },
            }),
        };
    }

    // Step 4: Split productIds into batches of 100 and fetch product details
    const batchSize = 100;
    let products = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
        const batchIds = productIds.slice(i, i + batchSize);

        const productsParams = {
            TableName: process.env.PRODUCTS_TABLE,
            ProjectionExpression: 'id, #name, category, subcategory, savingsPercentage, image, description, #unit',
            ExpressionAttributeNames: {
                '#name': 'name',
                '#unit': 'unit', // Map 'unit' to a placeholder
            },
            FilterExpression: 'id IN (' + batchIds.map((_, index) => `:productId${index}`).join(', ') + ')',
            ExpressionAttributeValues: Object.fromEntries(
                batchIds.map((id, index) => [`:productId${index}`, id])
            ),
        };

        try {
            const productsData = await docClient.send(new ScanCommand(productsParams));
            products = products.concat(productsData.Items || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to fetch products' }),
            };
        }
    }

    // Step 5: Join inventory price data with products
    products = products.map(product => {
        const inventoryItem = inventoryItems.find(item => item.productId === product.id);
        if (inventoryItem) {
            product.price = inventoryItem.onlineStorePrice || 0; // Attach price from Inventory
            product.unitPrices = inventoryItem.unitPrices || []; // Attach unit prices
        }
        return product;
    });

    // Step 6: Fetch cart items and wishlist items if userId is provided
    if (userId) {
        try {
            // Fetch cart items
            const cartParams = {
                TableName: process.env.CART_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                }
            };
            const cartData = await docClient.send(new QueryCommand(cartParams));
            const cartItems = cartData.Items || [];

            // Fetch wishlist items
            const wishlistParams = {
                TableName: process.env.WISHLIST_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                }
            };
            const wishlistData = await docClient.send(new QueryCommand(wishlistParams));
            const wishlistItems = wishlistData.Items || [];
            const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

            // Attach cart and wishlist information to products
            products.forEach(product => {
                const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
                const inWishlist = wishlistItemsSet.has(product.id);

                product.inCart = !!cartItem;
                product.inWishlist = inWishlist;
                product.savingsPercentage = product.savingsPercentage || 0,

                product.cartItem = cartItem || {
                    ProductId: product.id,
                    UserId: userId,
                    Savings: 0,
                    QuantityUnits: 0,
                    Subtotal: 0,
                    Price: 0,
                    Mrp: 0,
                    Quantity: 0,
                    productImage: product.image || '',
                    productName: product.name || '',
                    availability: product.availability || true // Set default availability
                };
            });
        } catch (error) {
            console.error('Error fetching cart or wishlist:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to fetch cart or wishlist' }),
            };
        }
    }

    // Step 7: Apply additional filters like discounts, category, subcategory, etc.
    if (discounts) {
        const discountRanges = {
            'upto5': [0, 5],
            '10to15': [10, 15],
            '15to25': [15, 25],
            'morethan25': [25, Number.MAX_SAFE_INTEGER]
        };

        const labels = discounts.split(',');
        products = products.filter(product => {
            const discount = parseFloat(product.savingsPercentage) || 0;
            return labels.some(label => {
                const range = discountRanges[label.trim().toLowerCase()];
                return discount >= range[0] && discount <= range[1];
            });
        });
    }

    if (category) {
        products = products.filter(product => product.category.toLowerCase() === category.toLowerCase());
    }

    if (subcategory) {
        products = products.filter(product => product.subcategory.toLowerCase() === subcategory.toLowerCase());
    }

    // Step 8: Paginate the results
    const totalFilteredProducts = products.length;
    const totalPages = Math.ceil(totalFilteredProducts / pageSize);

    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedProducts = products.slice(startIndex, startIndex + pageSize);

    // Step 9: Format the response
    const response = {
        products: paginatedProducts.map(product => ({
            ...product,
            unitPrices: product.unitPrices.map(unitPrice => ({
                mrp: unitPrice.discountedPrice,
                price: unitPrice.price,
                savings: unitPrice.savings,
                qty: unitPrice.qty,
            })),
            availability: true // Set availability if needed
        })),
        pagination: {
            currentPage: pageNumber,
            pageSize: pageSize,
            TotalProducts: totalFilteredProducts,
            totalPages: totalPages
        }
    };

    return {
        statusCode: 200,
        body: JSON.stringify(response),
    };
};
