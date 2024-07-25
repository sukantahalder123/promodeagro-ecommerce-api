const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { minPrice, maxPrice, discounts, userId, ratingFilter, category, subcategory } = event.queryStringParameters || {};

    // Define parameters for querying the Reviews table
    const reviewsParams = {
        TableName: 'UserReviews',
        ProjectionExpression: 'productId, rating'
    };

    // Define parameters for querying the Products table
    const productsParams = {
        TableName: 'Products',
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

        const ratingRange = ratingRanges[ratingFilter.trim()];
        if (ratingRange) {
            reviewsParams.FilterExpression = '#rating BETWEEN :minRating AND :maxRating';
            reviewsParams.ExpressionAttributeValues = {
                ':minRating': ratingRange[0],
                ':maxRating': ratingRange[1]
            };
            reviewsParams.ExpressionAttributeNames = {
                '#rating': 'rating'
            };

            // Fetch reviews and extract product IDs
            try {
                const reviewsData = await dynamoDb.scan(reviewsParams).promise();
                const reviews = reviewsData.Items;

                // Collect product IDs for which ratings fall within the specified range
                productIdsForRatingFilter = [...new Set(reviews.map(review => review.productId))];

                if (filterExpression.length > 0) {
                    filterExpression += ' AND ';
                }
                filterExpression += '#id IN (:productIds)';
                expressionAttributeValues[':productIds'] = productIdsForRatingFilter;
                productsParams.ExpressionAttributeNames['#id'] = 'id';
            } catch (error) {
                console.error('Error fetching reviews:', error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Failed to fetch reviews' })
                };
            }
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
        const productsData = await dynamoDb.scan(productsParams).promise();
        const products = productsData.Items;

        // Convert qty to grams in unitPrices
        products.forEach(product => {
            if (product.unitPrices) {
                product.unitPrices = product.unitPrices.map(unitPrice => ({
                    ...unitPrice,
                    qty: `${unitPrice.qty} grams`
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

            const cartData = await dynamoDb.query(cartParams).promise();
            const cartItems = cartData.Items;

            // Attach cart information to products
            products.forEach(product => {
                const cartItem = cartItems.find(item => item.ProductId === product.id) || null;

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
                        Quantity: "0 grams",
                        productImage: product.image || '',
                        productName: product.name || ''
                    };
                }
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
