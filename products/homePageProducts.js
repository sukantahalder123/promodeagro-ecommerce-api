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
            let items = data.Items?.map(product => ({
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
            })) || [];

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
                    product.inCart = !!cartItem;
                    product.inWishlist = wishlistItemsSet.has(product.id);

                    if (cartItem) {
                        product.cartItem = {
                            ProductId: cartItem.ProductId,
                            UserId: cartItem.UserId,
                            Savings: cartItem.Savings || 0,
                            QuantityUnits: cartItem.QuantityUnits || 0,
                            Subtotal: cartItem.Subtotal || 0,
                            Price: cartItem.Price || product.price,
                            Mrp: cartItem.Mrp || product.mrp,
                            Quantity: cartItem.Quantity || 0,
                            productImage: product.image || '',
                            productName: product.name || '',
                        };
                    }
                });
            }

            // Push the final category and subcategory with products
            result.push({
                category,
                subcategory,
                items,
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
