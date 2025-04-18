const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { userId } = event.queryStringParameters || {};

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
                },
            };

            const data = await docClient.query(params).promise();
            let products = data.Items || [];

            const productMap = {};
            products.forEach(product => {
                if (product.groupId) {
                    if (!productMap[product.groupId]) {
                        productMap[product.groupId] = [];
                    }
                    productMap[product.groupId].push(product);
                } else {
                    productMap[product.id] = [product];
                }
            });

            const groupedProducts = Object.keys(productMap).map(groupId => {
                const groupProducts = productMap[groupId];
                const mainProduct = groupProducts.find(p => !p.isVariant) || groupProducts[0];
                
                const variations = groupProducts
                    .filter(p => p.isVariant)
                    .map(variant => ({
                        id: variant.id,
                        name: variant.name || '',
                        category: variant.category || '',
                        subCategory: variant.subCategory || '',
                        image: variant.image || '',
                        images: variant.images || [],
                        description: variant.description || '',
                        availability: variant.availability || false,
                        tags: variant.tags || [],
                        price: variant.sellingPrice || 0,
                        mrp: variant.comparePrice || 0,
                        unit: variant.totalquantityB2cUnit || '',
                        quantity: variant.totalQuantityInB2c || '',
                        inCart: false,
                        inWishlist: false,
                        cartItem: {
                            ProductId: variant.id,
                            UserId: userId || 'defaultUserId',
                            Savings: 0,
                            QuantityUnits: 0,
                            Subtotal: 0,
                            Price: variant.sellingPrice || 0,
                            Mrp: variant.comparePrice || 0,
                            Quantity: 0,
                            productImage: variant.image || '',
                            productName: variant.name || '',
                        }
                    }));
                const isAnyVariantAvailable = variations.some(variant => variant.availability === true) || mainProduct.availability === true;

                return {
                    groupId: groupId,
                    name: mainProduct.name || '',
                    category: mainProduct.category || '',
                    subCategory: mainProduct.subCategory || '',
                    image: mainProduct.image || '',
                    images: mainProduct.images || [],
                    description: mainProduct.description || '',
                    tags: mainProduct.tags || [],
                    variations,
                    isAvailable: isAnyVariantAvailable, // Added flag for sorting

                  
                };
            });

            groupedProducts.sort((a, b) => {
                if (a.isAvailable === b.isAvailable) return 0;
                if (a.isAvailable && !b.isAvailable) return -1;
                return 1;
            });
    
            // Optional: Remove the isAvailable flag if you don't want to return it
            groupedProducts.forEach(product => {
                delete product.isAvailable;
            });
    

            if (userId) {
                const cartParams = {
                    TableName: process.env.CART_TABLE,
                    KeyConditionExpression: 'UserId = :userId',
                    ExpressionAttributeValues: { ':userId': userId },
                };
                const cartData = await docClient.query(cartParams).promise();
                const cartItems = cartData.Items;

                const wishlistParams = {
                    TableName: process.env.WISHLIST_TABLE,
                    KeyConditionExpression: 'UserId = :userId',
                    ExpressionAttributeValues: { ':userId': userId },
                };
                const wishlistData = await docClient.query(wishlistParams).promise();
                const wishlistItems = wishlistData.Items;
                const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

                groupedProducts.forEach(product => {
                    const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
                    product.inCart = !!cartItem;
                    product.inWishlist = wishlistItemsSet.has(product.id);
                    if (cartItem) {
                        product.cartItem = {
                            ...product.cartItem,
                            ...cartItem
                        };
                    }

                    product.variations.forEach(variant => {
                        const variantCartItem = cartItems.find(item => item.ProductId === variant.id) || null;
                        variant.inCart = !!variantCartItem;
                        variant.inWishlist = wishlistItemsSet.has(variant.id);
                        if (variantCartItem) {
                            variant.cartItem = {
                                ...variant.cartItem,
                                ...variantCartItem
                            };
                        }
                    });
                });
            }
            

            result.push({
                category,
                subcategory,
                items: groupedProducts,
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