'use strict';

const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const { minPrice, maxPrice, discounts, userId, ratingFilter, category, subcategory } = event.queryStringParameters || {};

    // Define parameters for querying the Reviews table
    const reviewsParams = {
        TableName: 'UserReviews',
        ProjectionExpression: 'productId, rating'
    };

    // Define parameters for querying the Products table
    const productsParams = {
        TableName: process.env.PRODUCTS_TABLE,
        ProjectionExpression: 'id, price, savingsPercentage, unitPrices, image, #name, category, subcategory',
        FilterExpression: '',
        ExpressionAttributeValues: {},
        ExpressionAttributeNames: {
            '#name': 'name'
        }
    };

    let filterExpression = '';
    const expressionAttributeValues = {};

    // Price range filter
    if (minPrice && maxPrice) {
        filterExpression += '#price BETWEEN :minPrice AND :maxPrice';
        expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
        expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
        productsParams.ExpressionAttributeNames['#price'] = 'price';
    } else if (minPrice) {
        filterExpression += '#price >= :minPrice';
        expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
        productsParams.ExpressionAttributeNames['#price'] = 'price';
    } else if (maxPrice) {
        filterExpression += '#price <= :maxPrice';
        expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
        productsParams.ExpressionAttributeNames['#price'] = 'price';
    }

    // Discount filter
    if (discounts) {
        const discountRanges = {
            'upto5': [0, 5],
            '10to15': [10, 15],
            '15to25': [15, 25],
            'morethan25': [25, Number.MAX_SAFE_INTEGER]
        };

        const labels = discounts.split(',');
        if (Array.isArray(labels) && labels.length > 0) {
            if (filterExpression.length > 0) {
                filterExpression += ' AND (';
            } else {
                filterExpression += '(';
            }
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i].trim().toLowerCase();
                if (discountRanges[label]) {
                    const [minDiscountValue, maxDiscountValue] = discountRanges[label];
                    const minDiscountKey = `:minDiscount${i}`;
                    const maxDiscountKey = `:maxDiscount${i}`;

                    if (i > 0) {
                        filterExpression += ' OR ';
                    }
                    filterExpression += `#savingsPercentage BETWEEN ${minDiscountKey} AND ${maxDiscountKey}`;

                    expressionAttributeValues[minDiscountKey] = minDiscountValue;
                    expressionAttributeValues[maxDiscountKey] = maxDiscountValue;
                }
            }
            filterExpression += ')';
            productsParams.ExpressionAttributeNames['#savingsPercentage'] = 'savingsPercentage';
        }
    }

    // Rating filter
    let productIdsForRatingFilter = [];
    if (ratingFilter) {
        const ratingRanges = {
            '5.0': [5, 5],
            '4.0 & up': [4, 5],
            '3.0 & up': [3, 5],
            '2.0 & up': [2, 5]
        };

        const ratingFilters = ratingFilter.split(',');
        const filteredProductIds = new Set();

        for (const rating of ratingFilters) {
            const ratingRange = ratingRanges[rating.trim()];
            if (ratingRange) {
                reviewsParams.FilterExpression = '#rating BETWEEN :minRating AND :maxRating';
                reviewsParams.ExpressionAttributeValues = {
                    ':minRating': ratingRange[0],
                    ':maxRating': ratingRange[1]
                };
                reviewsParams.ExpressionAttributeNames = {
                    '#rating': 'rating'
                };

                try {
                    const reviewsData = await docClient.send(new ScanCommand(reviewsParams));
                    const reviews = reviewsData.Items;

                    for (const review of reviews) {
                        filteredProductIds.add(review.productId);
                    }
                } catch (error) {
                    console.error('Error fetching reviews:', error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Failed to fetch reviews' })
                    };
                }
            }
        }

        productIdsForRatingFilter = Array.from(filteredProductIds);
        if (productIdsForRatingFilter.length > 0) {
            if (filterExpression.length > 0) {
                filterExpression += ' AND ';
            }

            const idFilters = productIdsForRatingFilter.map((id, index) => `:productId${index}`).join(', ');
            filterExpression += `#id IN (${idFilters})`;
            productIdsForRatingFilter.forEach((id, index) => {
                expressionAttributeValues[`:productId${index}`] = id;
            });
            productsParams.ExpressionAttributeNames['#id'] = 'id';
        }
    }

    // Category and Subcategory filter
    if (category) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#category = :category';
        expressionAttributeValues[':category'] = category;
        productsParams.ExpressionAttributeNames['#category'] = 'category';
    }

    if (subcategory) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#subcategory = :subcategory';
        expressionAttributeValues[':subcategory'] = subcategory;
        productsParams.ExpressionAttributeNames['#subcategory'] = 'subcategory';
    }

    // Adding the filter expression and attribute values to the productsParams
    if (filterExpression.length > 0) {
        productsParams.FilterExpression = filterExpression;
        productsParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    // Query Products using Scan with filters
    try {
        const productsData = await docClient.send(new ScanCommand(productsParams));
        const products = productsData.Items;

        // Convert qty to grams in unitPrices
        products.forEach(product => {
            if (product.unitPrices) {
                product.unitPrices = product.unitPrices.map(unitPrice => ({
                    ...unitPrice,
                    qty: unitPrice.qty
                }));
            }
        });

        // Fetch cart items for the user if userId is provided
        if (userId) {
            const cartParams = {
                TableName: 'CartItems',
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                }
            };

            const cartData = await docClient.send(new QueryCommand(cartParams));
            const cartItems = cartData.Items;

            // Fetch wishlist items for the user if userId is provided
            const wishlistParams = {
                TableName: 'ProductWishLists',
                KeyConditionExpression: 'UserId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId
                }
            };

            const wishlistData = await docClient.send(new QueryCommand(wishlistParams));
            const wishlistItems = wishlistData.Items;
            const wishlistItemsSet = new Set(wishlistItems.map(item => item.ProductId));

            // Attach cart and wishlist information to products
            products.forEach(product => {
                const cartItem = cartItems.find(item => item.ProductId === product.id) || null;
                const inWishlist = wishlistItemsSet.has(product.id);

                if (cartItem) {
                    product.inCart = true;
                    product.cartItem = cartItem;
                } else {
                    product.inCart = false;
                    product.cartItem = {
                        ProductId: product.id,
                        UserId: userId,
                        Savings: 0,
                        QuantityUnits: 0,
                        Subtotal: 0,
                        Price: 0,
                        Mrp: 0,
                        Quantity: 0,
                        productImage: product.image || '',
                        productName: product.name || ''
                    };
                }

                product.inWishlist = inWishlist;
            });
        } else {
            products.forEach(product => {
                product.inCart = false;
                product.inWishlist = false;
                product.cartItem = {
                    ProductId: product.id,
                    UserId: 'defaultUserId',
                    Savings: 0,
                    QuantityUnits: 0,
                    Subtotal: 0,
                    Price: 0,
                    Mrp: 0,
                    Quantity: 0,
                    productImage: product.image || '',
                    productName: product.name || ''
                };
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify(products),
        };
    } catch (error) {
        console.error('Error fetching products:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
