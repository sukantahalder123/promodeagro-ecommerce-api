'use strict';

const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

const SALES_TABLE_NAME = process.env.SALES_TABLE || "sales";
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE || "Products";
const CART_ITEMS_TABLE_NAME = process.env.CART_ITEMS_TABLE || "CartItems";
const WISHLIST_ITEMS_TABLE_NAME = process.env.WISHLIST_ITEMS_TABLE || "ProductWishLists";
const INVENTORY_TABLE_NAME = process.env.INVENTORY_TABLE || "Inventory";

exports.handler = async (event) => {
    try {
        const { subcategory, userId } = event.queryStringParameters || {};

        // Fetch all sales records
        const scanParams = {
            TableName: SALES_TABLE_NAME
        };
        const scanResult = await dynamoDB.send(new ScanCommand(scanParams));
        const sales = scanResult.Items.map(item => unmarshall(item));

        // Aggregate sales data by productId
        const salesByProduct = sales.reduce((acc, sale) => {
            const { productId, Quantity } = sale;
            if (!acc[productId]) {
                acc[productId] = 0;
            }
            acc[productId] += Quantity;
            return acc;
        }, {});

        // Sort products by total sales
        const topSellingProducts = Object.entries(salesByProduct)
            .sort(([, a], [, b]) => b - a)
            .map(([productId, totalQuantity]) => ({ productId, totalQuantity }));

        // Fetch all products
        const getAllProductsParams = { TableName: PRODUCTS_TABLE_NAME };
        const productsData = await dynamoDB.send(new ScanCommand(getAllProductsParams));

        if (!productsData.Items || productsData.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No products found' }),
            };
        }

        let products = productsData.Items.map(item => unmarshall(item));

        // Filter products by category and subcategory if provided
        if (subcategory) {
            products = products.filter(product => product.subCategory && product.subCategory === subcategory);
        }

        // Fetch inventory data for the top-selling products
        const getInventoryData = async (productId) => {
            const inventoryParams = {
                TableName: INVENTORY_TABLE_NAME,
                IndexName: "productIdIndex", // Replace with your actual GSI name
                KeyConditionExpression: "productId = :productId",
                ExpressionAttributeValues: {
                    ":productId": { S: productId },
                },
            };

            const inventoryData = await dynamoDB.send(new QueryCommand(inventoryParams));
            if (inventoryData.Items && inventoryData.Items.length > 0) {
                const inventoryItem = unmarshall(inventoryData.Items[0]);
                return {
                    price: inventoryItem.unitPrices[0].price,
                    mrp: inventoryItem.unitPrices[0].mrp,
                    unitPrices: inventoryItem.unitPrices
                };
            }
            return {};
        };

        // Filter top-selling products and merge product details
        const topSellingProductDetails = await Promise.all(topSellingProducts.map(async (topProduct) => {
            const product = products.find(p => p.id === topProduct.productId);
            if (product) {
                const inventoryData = await getInventoryData(topProduct.productId);
                return {
                    ...topProduct,
                    ...product,
                    price: inventoryData.price || 0,
                    mrp: inventoryData.mrp || 0,
                    unitPrices: inventoryData.unitPrices || [],
                    inCart: false, // Default value
                    inWishlist: false // Default value
                };
            }
            return null;
        }));

        // Fetch cart items and wishlist items if userId is provided
        let cartItemsMap = new Map();
        let wishlistItemsSet = new Set();

        if (userId) {
            const getCartItemsParams = {
                TableName: CART_ITEMS_TABLE_NAME,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: { ':userId': { S: userId } },
            };
            const cartData = await dynamoDB.send(new QueryCommand(getCartItemsParams));

            if (cartData.Items) {
                cartData.Items.map(item => unmarshall(item)).forEach(item => {
                    cartItemsMap.set(item.ProductId, item);
                });
            }

            const getWishlistItemsParams = {
                TableName: WISHLIST_ITEMS_TABLE_NAME,
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: { ':userId': { S: userId } },
            };
            const wishlistData = await dynamoDB.send(new QueryCommand(getWishlistItemsParams));

            if (wishlistData.Items) {
                wishlistData.Items.map(item => unmarshall(item)).forEach(item => {
                    wishlistItemsSet.add(item.ProductId);
                });
            }
        }

        // Merge cart and wishlist items with top-selling products
        const topSellingProductsWithInfo = topSellingProductDetails
            .filter(product => product !== null)
            .map(product => {
                const cartItem = cartItemsMap.get(product.id) || {
                    ProductId: product.id,
                    UserId: userId || '',
                    Savings: 0,
                    QuantityUnits: 0,
                    Subtotal: 0,
                    Price: 0,
                    Mrp: 0,
                    Quantity: 0,
                    productImage: product.image || '',
                    productName: product.name || ''
                };
                return {
                    ...product,
                    inCart: cartItemsMap.has(product.id),
                    inWishlist: wishlistItemsSet.has(product.id),
                    cartItem
                };
            });

        return {
            statusCode: 200,
            body: JSON.stringify({ topSellingProducts: topSellingProductsWithInfo }),
        };
    } catch (error) {
        console.error('Error fetching top-selling products:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch data', error }),
        };
    }
};
