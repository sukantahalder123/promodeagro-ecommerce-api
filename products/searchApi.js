const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { name, minPrice, maxPrice } = event.queryStringParameters || {};

    const params = {
        TableName: 'Products',
    };

    let filterExpression = '';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name) {
        filterExpression += '#name = :name';
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = name;
    }

    if (minPrice) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#price >= :minPrice';
        expressionAttributeNames['#price'] = 'price';
        expressionAttributeValues[':minPrice'] = parseFloat(minPrice);
    }

    if (maxPrice) {
        if (filterExpression.length > 0) {
            filterExpression += ' AND ';
        }
        filterExpression += '#price <= :maxPrice';
        expressionAttributeNames['#price'] = 'price';
        expressionAttributeValues[':maxPrice'] = parseFloat(maxPrice);
    }

    if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeNames = expressionAttributeNames;
        params.ExpressionAttributeValues = expressionAttributeValues;
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
