const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { groupId, userId } = event.queryStringParameters || {};

    if (!groupId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "groupId is required" }),
        };
    }

    try {
        // Step 1: Query products where groupId matches
        const params = {
            TableName: process.env.PRODUCTS_TABLE,
            IndexName: 'groupId-index', // Assuming you have a GSI on groupId
            KeyConditionExpression: 'groupId = :groupId',
            ExpressionAttributeValues: {
                ':groupId': groupId
            },
        };

        const data = await docClient.query(params).promise();
        const variants = data.Items || [];

        if (variants.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No products found for this groupId' }),
            };
        }

        // Step 2: If userId is present, fetch cart and wishlist
        let cartItems = [];
        let wishlistItemsSet = new Set();

        if (userId) {
            // Fetch cart items
            const cartParams = {
                TableName: process.env.CART_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: { ':userId': userId },
            };
            const cartData = await docClient.query(cartParams).promise();
            cartItems = cartData.Items || [];

            // Fetch wishlist items
            const wishlistParams = {
                TableName: process.env.WISHLIST_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: { ':userId': userId },
            };
            const wishlistData = await docClient.query(wishlistParams).promise();
            const wishlistItems = wishlistData.Items || [];
            wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));
        }

        // Step 3: Format the response
        const mainProduct = variants.find(p => !p.isVariant) || variants[0];

        const response = {
            groupId: groupId,
            name: mainProduct.name || '',
            category: mainProduct.category || '',
            subCategory: mainProduct.subCategory || '',
            image: mainProduct.image || '',
            images: mainProduct.images || [],
            description: mainProduct.description || '',
            tags: mainProduct.tags || [],
            variants: variants.map(variant => buildProductResponse(variant, userId, cartItems, wishlistItemsSet)),
        };

        // Step 4: Return the formatted response
        return {
            statusCode: 200,
            body: JSON.stringify(response),
        };

    } catch (error) {
        console.error('Error fetching product variants:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message,
            }),
        };
    }
};

// Helper function to build product/variant with cart and wishlist status
function buildProductResponse(product, userId, cartItems = [], wishlistSet = new Set()) {
    const cartItem = cartItems.find(item => item.ProductId === product.id) || null;

    return {
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
        unit: product.totalquantityB2cUnit || '',
        quantity: product.totalQuantityInB2c || '',
        inCart: !!cartItem,
        inWishlist: wishlistSet.has(product.id),
        cartItem: cartItem
            ? {
                ...cartItem,
                selectedQuantityUnitPrice: product.sellingPrice || 0,
                selectedQuantityUnitMrp: product.comparePrice || 0,
            }
            : {
                ProductId: product.id,
                UserId: userId,
                Savings: 0,
                QuantityUnits: 0,
                Subtotal: 0,
                Price: product.sellingPrice || 0,
                Mrp: product.comparePrice || 0,
                Quantity: 0,
                productImage: product.image || '',
                productName: product.name || '',
            },
    };
}
