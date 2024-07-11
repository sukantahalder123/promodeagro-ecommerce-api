const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        // Parse filter parameters from event or API request
        const filters = JSON.parse(event.body);

        // Construct DynamoDB query parameters based on filters
        const params = {
            TableName: 'Products', // Replace with your DynamoDB table name
            FilterExpression: buildFilterExpression(filters),
            ExpressionAttributeValues: buildExpressionAttributeValues(filters),
        };

        // Query DynamoDB
        const data = await dynamoDB.scan(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        console.error('Error querying DynamoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch products', error: error.message }),
        };
    }
};

function buildFilterExpression(filters) {
    let filterExpression = '';

    // Add conditions based on filters
    if (filters.minPrice && filters.maxPrice) {
        filterExpression += 'price between :minPrice and :maxPrice';
    } else if (filters.minPrice) {
        filterExpression += 'price >= :minPrice';
    } else if (filters.maxPrice) {
        filterExpression += 'price <= :maxPrice';
    }

    // Add rating condition
    if (filters.minRating) {
        filterExpression += ' and ratings >= :minRating';
    }

    // Add discount condition
    if (filters.discountCategory) {
        switch (filters.discountCategory) {
            case 'Up to 5%':
                filterExpression += ' and savingsPercentage <= :maxDiscount5';
                break;
            case '10% - 15%':
                filterExpression += ' and savingsPercentage >= :minDiscount10 and savingsPercentage <= :maxDiscount15';
                break;
            case '15% - 25%':
                filterExpression += ' and savingsPercentage >= :minDiscount15 and savingsPercentage <= :maxDiscount25';
                break;
            case 'More than 25%':
                filterExpression += ' and savingsPercentage > :minDiscount25';
                break;
            default:
                break;
        }
    }

    return filterExpression;
}

function buildExpressionAttributeValues(filters) {
    const attributeValues = {};

    // Add price values
    if (filters.minPrice) {
        attributeValues[':minPrice'] = filters.minPrice;
    }
    if (filters.maxPrice) {
        attributeValues[':maxPrice'] = filters.maxPrice;
    }

    // Add rating value
    if (filters.minRating) {
        attributeValues[':minRating'] = filters.minRating;
    }

    // Add discount values
    if (filters.discountCategory) {
        switch (filters.discountCategory) {
            case 'Up to 5%':
                attributeValues[':maxDiscount5'] = 5;
                break;
            case '10% - 15%':
                attributeValues[':minDiscount10'] = 10;
                attributeValues[':maxDiscount15'] = 15;
                break;
            case '15% - 25%':
                attributeValues[':minDiscount15'] = 15;
                attributeValues[':maxDiscount25'] = 25;
                break;
            case 'More than 25%':
                attributeValues[':minDiscount25'] = 25;
                break;
            default:
                break;
        }
    }

    return attributeValues;
}
