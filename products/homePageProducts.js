const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { userId } = event.queryStringParameters || {}; // Get userId from query parameters, if provided

    const categories = [
        { category: 'Bengali Special', subcategory: 'Bengali Vegetables' },
        { category: 'Fresh Fruits', subcategory: 'Daily Fruits' },
        { category: 'Fresh Vegetables', subcategory: 'Daily Vegetables' }
    ];

    try {
        const result = [];

        for (const { category, subcategory } of categories) {
            const params = {
                TableName: process.env.PRODUCTS_TABLE,
                IndexName: 'subCategoryIndex',
                KeyConditionExpression: 'subCategory = :subcategory',
                ExpressionAttributeValues: {
                    ':subcategory': subcategory,
                    ':trueValue': true,  // Ensure the product is available
                },
                FilterExpression: '#availability = :trueValue',
                ExpressionAttributeNames: {
                    '#availability': 'availability',
                },
            };

            const data = await docClient.query(params).promise();
            let items = data.Items || [];

            // Fetch inventory data for each product
            for (let product of items) {
                const inventoryParams = {
                    TableName: process.env.INVENTORY_TABLE,
                    IndexName: "productIdIndex",
                    KeyConditionExpression: "productId = :productId",
                    ExpressionAttributeValues: {
                        ":productId": product.id,
                    },
                };

                const inventoryData = await docClient.query(inventoryParams).promise();
                const inventoryItem = inventoryData.Items && inventoryData.Items[0];

                if (inventoryItem) {
                    product.price = inventoryItem.unitPrices[0].price || 0;
                    product.mrp = inventoryItem.unitPrices[0].discountedPrice || 0;
                    product.unitPrices = inventoryItem.unitPrices || [];
                }

                // Convert qty to grams or any other unit conversion if required
                if (product.unitPrices) {
                    product.unitPrices = product.unitPrices.map(unitPrice => ({
                        ...unitPrice,
                        qty: unitPrice.qty,  // Modify if you need to adjust quantity logic
                    }));
                }
            }

            // If user is logged in, fetch cart and wishlist data
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

                // Update product data with cart and wishlist information
                items.forEach(product => {
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
                        product.savingsPercentage = product.savingsPercentage || 0;
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
                // If no userId, set default cart/wishlist data
                items.forEach(product => {
                    product.inCart = false;
                    product.savingsPercentage = product.savingsPercentage || 0;
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

            // Push the final category and subcategory with products
            result.push({
                category: category,
                subcategory: subcategory,
                items: items,
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('Error fetching products:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
