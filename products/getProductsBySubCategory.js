const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { subcategory, userId, pageSize = 10, pageNumber = 1, exclusiveStartKey } = event.queryStringParameters;

    if (!subcategory) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Subcategory is required" }),
        };
    }

    // Decode the ExclusiveStartKey
    const decodedExclusiveStartKey = exclusiveStartKey
        ? JSON.parse(Buffer.from(decodeURIComponent(exclusiveStartKey), 'base64').toString('utf8'))
        : undefined;

    try {
        // Fetch total item count for the subcategory
        const countParams = {
            TableName: process.env.PRODUCTS_TABLE,
            IndexName: 'subCategoryIndex',
            KeyConditionExpression: 'subCategory = :subcategory',
            ExpressionAttributeValues: {
                ':subcategory': subcategory, // Define subcategory correctly\
                ':trueValue': true,  // Correct boolean for availability
            },
            Select: 'COUNT',
            FilterExpression: '#availability = :trueValue',  // Use availability in FilterExpression
            ExpressionAttributeNames: {
                '#availability': 'availability',  // Define availability correctly
            },
        };
        const countData = await docClient.query(countParams).promise();
        const totalItems = countData.Count;
        const totalPages = Math.ceil(totalItems / parseInt(pageSize));

        // Fetch paginated products
        const params = {
            TableName: process.env.PRODUCTS_TABLE,
            IndexName: 'subCategoryIndex',
            KeyConditionExpression: 'subCategory = :subcategory',  // Using subCategory as partition key
            ExpressionAttributeValues: {
                ':subcategory': subcategory,
                ':trueValue': true,  // Correct boolean for availability
            },
            Limit: parseInt(pageSize),
            ExclusiveStartKey: decodedExclusiveStartKey,
            FilterExpression: '#availability = :trueValue',  // Use availability in FilterExpression
            ExpressionAttributeNames: {
                '#availability': 'availability',  // Define availability correctly
            },
        };

        const data = await docClient.query(params).promise();
        let products = data.Items || [];

        // Fetch inventory data for each product using productIdIndex
        for (let product of products) {
            const inventoryParams = {
                TableName: process.env.INVENTORY_TABLE,
                IndexName: "productIdIndex",  // GSI name for inventory
                KeyConditionExpression: "productId = :productId",
                ExpressionAttributeValues: {
                    ":productId": product.id,  // Product id
                },
            };

            const inventoryData = await docClient.query(inventoryParams).promise();
            const inventoryItem = inventoryData.Items && inventoryData.Items[0];

            // If inventory data exists, update the product with price, mrp, and unitPrices
            if (inventoryItem) {
                product.price = inventoryItem.unitPrices[0].price || 0;
                product.mrp = inventoryItem.unitPrices[0].discountedPrice || 0;
                product.unitPrices = inventoryItem.unitPrices || [];
            }

            // Convert qty to grams in unitPrices if needed
            if (product.unitPrices) {
                product.unitPrices = product.unitPrices.map(unitPrice => ({
                    ...unitPrice,
                    qty: unitPrice.qty,  // If required, adjust this logic
                }));
            }
        }

        if (userId) {
            // Fetch cart items for the user
            const cartParams = {
                TableName: process.env.CART_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
            };

            const cartData = await docClient.query(cartParams).promise();
            const cartItems = cartData.Items;

            // Fetch wishlist items for the user
            const wishlistParams = {
                TableName: process.env.WISHLIST_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
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
                        selectedQuantityUnitprice: product.price,
                        selectedQuantityUnitMrp: product.mrp,
                    };
                } else {
                    product.inCart = false;
                    product.savingsPercentage = product.savingsPercentage || 0,
                    product.cartItem = {
                        ProductId: product.id,
                        UserId: userId,
                        Savings: 0,
                        QuantityUnits: 0,
                        Subtotal: 0,
                        Price: product.price || 0,
                        Mrp: product.mrp || 0,
                        Quantity: 0,
                        productImage: product.image || '',
                        productName: product.name || '',
                    };
                }

                product.inWishlist = inWishlist;
            });
        } else {
            products.forEach(product => {
                product.inCart = false;
                product.savingsPercentage = product.savingsPercentage || 0
                product.inWishlist = false;
                product.cartItem = {
                    ProductId: product.id,
                    UserId: 'defaultUserId',
                    Savings: 0,
                    QuantityUnits: 0,
                    Subtotal: 0,
                    Price: product.price || 0,
                    Mrp: product.mrp || 0,
                    Quantity: 0,
                    productImage: product.image || '',
                    productName: product.name || '',
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

                // currentTotalProducts: products.length,
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
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
