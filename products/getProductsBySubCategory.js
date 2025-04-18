// const AWS = require('aws-sdk');
// const docClient = new AWS.DynamoDB.DocumentClient();
// require('dotenv').config();

// exports.handler = async (event) => {
//     const { subcategory, userId } = event.queryStringParameters || {};

//     if (!subcategory) {
//         return {
//             statusCode: 400,
//             body: JSON.stringify({ message: "Subcategory is required" }),
//         };
//     }

//     try {
//         // Step 1: Query products by subcategory with availability = true
//         const productParams = {
//             TableName: process.env.PRODUCTS_TABLE,
//             IndexName: 'subCategoryIndex',
//             KeyConditionExpression: 'subCategory = :subcategory',
//             ExpressionAttributeValues: {
//                 ':subcategory': subcategory,
//             },
           
//         };

//         const productData = await docClient.query(productParams).promise();
//         const products = productData.Items || [];

//         // Step 2: Group products by groupId (or id if no groupId)
//         const productMap = {};
//         products.forEach(product => {
//             if (product.groupId) {
//                 if (!productMap[product.groupId]) {
//                     productMap[product.groupId] = [];
//                 }
//                 productMap[product.groupId].push(product);
//             } else {
//                 productMap[product.id] = [product];
//             }
//         });

//         const groupedProducts = Object.keys(productMap).map(groupId => {
//             const groupProducts = productMap[groupId];
//             const mainProduct = groupProducts.find(p => !p.isVariant) || groupProducts[0];

//             const variations = groupProducts
//                 .filter(p => p.isVariant)
//                 .map(variant => ({
//                     id: variant.id,
//                     name: variant.name || '',
//                     category: variant.category || '',
//                     subCategory: variant.subCategory || '',
//                     image: variant.image || '',
//                     images: variant.images || [],
//                     description: variant.description || '',
//                     availability: variant.availability || false,
//                     tags: variant.tags || [],
//                     price: variant.sellingPrice || 0,
//                     mrp: variant.comparePrice || 0,
//                     unit: variant.totalquantityB2cUnit || '',
//                     quantity: variant.totalQuantityInB2c || '',
//                     inCart: false,
//                     inWishlist: false,
//                     cartItem: {
//                         ProductId: variant.id,
//                         UserId: userId || 'defaultUserId',
//                         Savings: 0,
//                         QuantityUnits: 0,
//                         Subtotal: 0,
//                         Price: variant.sellingPrice || 0,
//                         Mrp: variant.comparePrice || 0,
//                         Quantity: 0,
//                         productImage: variant.image || '',
//                         productName: variant.name || '',
//                     }
//                 }));

//             return {
//                 groupId: groupId,
//                 name: mainProduct.name || '',
//                 category: mainProduct.category || '',
//                 subCategory: mainProduct.subCategory || '',
//                 image: mainProduct.image || '',
//                 images: mainProduct.images || [],
//                 description: mainProduct.description || '',
//                 tags: mainProduct.tags || [],
//                 variations,

//             };
//         });

//         if (userId) {
//             const cartParams = {
//                 TableName: process.env.CART_TABLE,
//                 KeyConditionExpression: 'UserId = :userId',
//                 ExpressionAttributeValues: { ':userId': userId },
//             };
//             const cartData = await docClient.query(cartParams).promise();
//             const cartItems = cartData.Items;

//             const wishlistParams = {
//                 TableName: process.env.WISHLIST_TABLE,
//                 KeyConditionExpression: 'UserId = :userId',
//                 ExpressionAttributeValues: { ':userId': userId },
//             };
//             const wishlistData = await docClient.query(wishlistParams).promise();
//             const wishlistItems = wishlistData.Items;
//             const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

//             groupedProducts.forEach(product => {
//                 const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
//                 product.inCart = !!cartItem;
//                 product.inWishlist = wishlistItemsSet.has(product.id);
//                 if (cartItem) {
//                     product.cartItem = {
//                         ...product.cartItem,
//                         ...cartItem
//                     };
//                 }

//                 product.variations.forEach(variant => {
//                     const variantCartItem = cartItems.find(item => item.ProductId === variant.id) || null;
//                     variant.inCart = !!variantCartItem;
//                     variant.inWishlist = wishlistItemsSet.has(variant.id);
//                     if (variantCartItem) {
//                         variant.cartItem = {
//                             ...variant.cartItem,
//                             ...variantCartItem
//                         };
//                     }
//                 });
//             });
//         }

     


//         // Step 5: Return the response
//         return {
//             statusCode: 200,
//             body: JSON.stringify({ products: groupedProducts }),
//         };

//     } catch (error) {
//         console.error('Error fetching products:', error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({
//                 message: "Internal Server Error",
//                 error: error.message,
//             }),
//         };
//     }
// };

// // Helper function to build product/variation object
// function buildProductResponse(product, userId, cartItem = null, wishlistSet = new Set()) {
//     return {
//         id: product.id,
//         name: product.name || '',
//         category: product.category || '',
//         subCategory: product.subCategory || '',
//         image: product.image || '',
//         images: product.images || [],
//         description: product.description || '',
//         availability: product.availability || false,
//         tags: product.tags || [],
//         price: product.sellingPrice || 0,
//         mrp: product.comparePrice || 0,
//         unit: product.totalquantityB2cUnit || '',
//         quantity: product.totalQuantityInB2c || '',
//         inCart: !!cartItem,
//         inWishlist: wishlistSet.has(product.id),
//         cartItem: cartItem
//             ? {
//                 ...cartItem,
//                 selectedQuantityUnitPrice: product.sellingPrice || 0,
//                 selectedQuantityUnitMrp: product.comparePrice || 0,
//             }
//             : {
//                 ProductId: product.id,
//                 UserId: userId,
//                 Savings: 0,
//                 QuantityUnits: 0,
//                 Subtotal: 0,
//                 Price: product.sellingPrice || 0,
//                 Mrp: product.comparePrice || 0,
//                 Quantity: 0,
//                 productImage: product.image || '',
//                 productName: product.name || '',
//             },
//     };
// }
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { subcategory, userId } = event.queryStringParameters || {};

    if (!subcategory) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Subcategory is required" }),
        };
    }

    try {
        // Step 1: Query products by subcategory with availability = true
        const productParams = {
            TableName: process.env.PRODUCTS_TABLE,
            IndexName: 'subCategoryIndex',
            KeyConditionExpression: 'subCategory = :subcategory',
            ExpressionAttributeValues: {
                ':subcategory': subcategory,
            },
        };

        const productData = await docClient.query(productParams).promise();
        const products = productData.Items || [];

        // Step 2: Group products by groupId (or id if no groupId)
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

        // Step 3: Map and group products
        let groupedProducts = Object.keys(productMap).map(groupId => {
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

            // Check if any variation or main product is available
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

        // Step 4: Sort products - available first, unavailable last
        groupedProducts.sort((a, b) => {
            if (a.isAvailable === b.isAvailable) return 0;
            if (a.isAvailable && !b.isAvailable) return -1;
            return 1;
        });

        // Optional: Remove the isAvailable flag if you don't want to return it
        groupedProducts.forEach(product => {
            delete product.isAvailable;
        });

        // Step 5: Add cart/wishlist status if userId is provided
        if (userId) {
            const cartParams = {
                TableName: process.env.CART_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: { ':userId': userId },
            };
            const cartData = await docClient.query(cartParams).promise();
            const cartItems = cartData.Items || [];

            const wishlistParams = {
                TableName: process.env.WISHLIST_TABLE,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: { ':userId': userId },
            };
            const wishlistData = await docClient.query(wishlistParams).promise();
            const wishlistItems = wishlistData.Items || [];
            const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

            groupedProducts.forEach(product => {
                const cartItem = cartItems.find(item => item.ProductId === product.groupId) || null;
                product.inCart = !!cartItem;
                product.inWishlist = wishlistItemsSet.has(product.groupId);
                if (cartItem) {
                    product.cartItem = {
                        ProductId: product.groupId,
                        ...cartItem
                    };
                }

                product.variations.forEach(variant => {
                    const variantCartItem = cartItems.find(item => item.ProductId === variant.id) || null;
                    variant.inCart = !!variantCartItem;
                    variant.inWishlist = wishlistItemsSet.has(variant.id);
                    if (variantCartItem) {
                        variant.cartItem = {
                            ProductId: variant.id,
                            ...variantCartItem
                        };
                    }
                });
            });
        }

        // Step 6: Return the response
        return {
            statusCode: 200,
            body: JSON.stringify({ products: groupedProducts }),
        };

    } catch (error) {
        console.error('Error fetching products:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message,
            }),
        };
    }
};

// Helper function (you can use this elsewhere if needed)
function buildProductResponse(product, userId, cartItem = null, wishlistSet = new Set()) {
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
