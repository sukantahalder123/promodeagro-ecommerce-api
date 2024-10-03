'use strict';

const { DynamoDBClient, ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

const SALES_TABLE_NAME = process.env.SALES_TABLE || "sales";
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE || "Products";
const CART_ITEMS_TABLE_NAME = process.env.CART_ITEMS_TABLE || "CartItems";
const WISHLIST_ITEMS_TABLE_NAME = process.env.WISHLIST_ITEMS_TABLE || "ProductWishLists";

exports.handler = async (event) => {
    try {
        // Fetch all sales records
        const scanParams = {
            TableName: SALES_TABLE_NAME
        };

        const scanResult = await dynamoDB.send(new ScanCommand(scanParams));
        const sales = scanResult.Items.map(item => unmarshall(item));

        // Aggregate sales data by subcategory
        const salesBySubcategory = sales.reduce((acc, sale) => {
            const { Subcategory, Quantity } = sale;
            if (!acc[Subcategory]) {
                acc[Subcategory] = 0;
            }
            acc[Subcategory] += Quantity;
            return acc;
        }, {});

        // Sort subcategories by total sales
        const topSellingSubcategories = Object.entries(salesBySubcategory)
            .sort(([, a], [, b]) => b - a)
            .map(([subcategory, totalQuantity]) => ({ subcategory, totalQuantity }));

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

        // Filter products based on top-selling subcategories
        const topSellingSubcategoryProducts = products.filter(product => 
            topSellingSubcategories.some(subcategory => subcategory.subcategory === product.subcategory)
        );

        // Fetch cart items and wishlist items if userId is provided
        let cartItemsMap = new Map();
        let wishlistItemsSet = new Set();

        const userId = event.queryStringParameters && event.queryStringParameters.userId;

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

        // Merge cart and wishlist items with products
        const productsWithCartInfo = topSellingSubcategoryProducts.map(product => {
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
            body: JSON.stringify({ topSellingSubcategories, products: productsWithCartInfo }),
        };
    } catch (error) {
        console.error('Error fetching top-selling subcategory products:', error);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Failed to fetch data', error }),
        };
    }
};
