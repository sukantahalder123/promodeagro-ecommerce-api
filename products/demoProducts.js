const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { subcategory, userId } = event.queryStringParameters;

    if (!subcategory) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Subcategory is required" }),
        };
    }

    try {
        // Fetch all products related to the subcategory
        const params = {
            TableName: 'dev-promodeagro-admin-productsTable',
            IndexName: 'subCategoryIndex',
            KeyConditionExpression: 'subCategory = :subcategory',
            ExpressionAttributeValues: {
                ':subcategory': subcategory,
                ':trueValue': true,
            },
            FilterExpression: '#availability = :trueValue',
            ExpressionAttributeNames: {
                '#availability': 'availability',
            },
        };

        const data = await docClient.query(params).promise();
        let products = data.Items || [];

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
            const wishlistItemsSet = new Set(wishlistData.Items.map(item => item.ProductId));

            products = products.map(product => {
                const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
                const inWishlist = wishlistItemsSet.has(product.id);

                return {
                    ...product,
                    inCart: !!cartItem,
                    inWishlist,
                    cartItem: cartItem ? {
                        ...cartItem,
                        selectedQuantityUnitPrice: product.price,
                        selectedQuantityUnitMrp: product.mrp,
                    } : {
                        ProductId: product.id,
                        UserId: userId,
                        Savings: 0,
                        QuantityUnits: 0,
                        Subtotal: 0,
                        Price: product.price,
                        Mrp: product.mrp,
                        Quantity: 0,
                        productImage: product.image,
                        productName: product.name,
                    },
                };
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ products }),
        };
    } catch (error) {
        console.error('Error fetching products:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
