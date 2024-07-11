const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { name, minPrice, maxPrice, discounts } = event.queryStringParameters || {};

    const params = {
        TableName: 'Products',
    };

    let filterExpression = '';
    const expressionAttributeValues = {};

    if (name) {
        filterExpression += 'contains(#name, :name)';
        expressionAttributeValues[':name'] = name.toLowerCase();
        params.ExpressionAttributeNames = {
            '#name': 'name',
        };
    }

    if (minPrice && maxPrice) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#price BETWEEN :minPrice AND :maxPrice';
        expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
        expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
        params.ExpressionAttributeNames = {
            ...params.ExpressionAttributeNames,
            '#price': 'price',
        };
    } else if (minPrice) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#price >= :minPrice';
        expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
        params.ExpressionAttributeNames = {
            ...params.ExpressionAttributeNames,
            '#price': 'price',
        };
    } else if (maxPrice) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#price <= :maxPrice';
        expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
        params.ExpressionAttributeNames = {
            ...params.ExpressionAttributeNames,
            '#price': 'price',
        };
    }

    if (discounts) {
        const discountRanges = {
            'upto5': [0, 5],
            '10to15': [10, 15],
            '15to25': [15, 25],
            'morethan25': [25, Number.MAX_SAFE_INTEGER],
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
            params.ExpressionAttributeNames = {
                ...params.ExpressionAttributeNames,
                '#savingsPercentage': 'savingsPercentage',
            };
        }
    }

    if (Object.keys(expressionAttributeValues).length > 0) {
        params.ExpressionAttributeValues = expressionAttributeValues;
    }

    if (filterExpression) {
        params.FilterExpression = filterExpression;
    }

    try {
        const data = await dynamoDb.scan(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
