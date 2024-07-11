const axios = require('axios');
require('dotenv').config();
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
const CATALOG_ID = process.env.CATALOG_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const categoryTable = process.env.CATEGORY_TABLE; // Replace with your actual DynamoDB table name for categories

// Function to validate if category and subcategory exist
async function validateCategory(category, subcategory) {
    const params = {
        TableName: categoryTable,
        IndexName: 'CategoryName-index', // Replace with your actual GSI name for CategoryName index
        KeyConditionExpression: 'CategoryName = :categoryName',
        ExpressionAttributeValues: {
            ':categoryName': category,
            ':subcategory': subcategory
        },
        FilterExpression: 'contains(Subcategories, :subcategory)'
    };

    try {
        const data = await dynamoDB.query(params).promise();
        if (data && data.Items && data.Items.length > 0) {
            return true; // Category and subcategory exist
        } else {
            return false; // Category or subcategory not found
        }
    } catch (err) {
        console.error('Error validating category:', err);
        throw err;
    }
}

// Lambda function handler
exports.handler = async (event) => {
    try {
        // Input validation
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing request body' }),
            };
        }

        const productData = JSON.parse(event.body);

        const updateFbData = {};

        // Check if ID is provided
        if (!productData.id) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required field: id' }),
            };
        }

        const tableName = 'Products'; // Replace with your actual DynamoDB table name for products

        // Prepare update expression and attribute values for DynamoDB update
        let updateExpression = 'SET ';
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        // Update the price, savings, and unitPrices if MRP or savingsPercentage is updated
        if (productData.mrp || productData.savingsPercentage) {
            // Recalculate price and savings
            const mrp = productData.mrp || 0;
            const savingsPercentage = productData.savingsPercentage || 0;
            const savings = (savingsPercentage / 100) * mrp;
            const price = mrp - savings;

            updateExpression += '#mrp = :mrp, #price = :price, #savingsPercentage = :savingsPercentage, ';
            expressionAttributeNames['#mrp'] = 'mrp';
            expressionAttributeNames['#price'] = 'price';
            expressionAttributeNames['#savingsPercentage'] = 'savingsPercentage';
            expressionAttributeValues[':mrp'] = mrp;
            expressionAttributeValues[':price'] = price; // Convert to cents for USD
            expressionAttributeValues[':savingsPercentage'] = savingsPercentage;

            // Update updateFbData for Facebook Graph API update
            updateFbData.price = Math.round(price * 100);
            updateFbData.mrp = mrp;
            updateFbData.savingsPercentage = savingsPercentage;

            // Calculate unitPrices if unit is in KG
            if (productData.unit && productData.unit.toUpperCase() === 'KG') {
                const unitPrices = await calculateUnitPrices(mrp, savings);
                updateExpression += '#unitPrices = :unitPrices, ';
                expressionAttributeNames['#unitPrices'] = 'unitPrices';
                expressionAttributeValues[':unitPrices'] = unitPrices;
                updateFbData.unitPrices = unitPrices;
            }
        }

        // Update other fields if provided
        if (productData.name) {
            updateExpression += '#name = :name, ';
            expressionAttributeNames['#name'] = 'name';
            expressionAttributeValues[':name'] = productData.name;
            updateFbData.name = productData.name;
        }

        if (productData.image && productData.imageType) {
            // Upload image to S3
            const s3params = {
                Bucket: 'ecomdmsservice',
                Key: `${productData.name}-${productData.id}`, // Adjust this as per your requirement
                Body: Buffer.from(productData.image, 'base64'),
                ContentType: productData.imageType
            };
            const uploadResult = await s3.upload(s3params).promise();
            const publicUrl = uploadResult.Location;

            updateExpression += '#image = :image, ';
            expressionAttributeNames['#image'] = 'image';
            expressionAttributeValues[':image'] = publicUrl; // Store the S3 URL in DynamoDB
            updateFbData.image_url = publicUrl;
        }

        if (productData.description) {
            updateExpression += '#description = :description, ';
            expressionAttributeNames['#description'] = 'description';
            expressionAttributeValues[':description'] = productData.description;
            updateFbData.description = productData.description;
        }

        if (productData.unit) {
            updateExpression += '#unit = :unit, ';
            expressionAttributeNames['#unit'] = 'unit';
            expressionAttributeValues[':unit'] = productData.unit.toUpperCase();
        }

        if (productData.category) {
            // Validate category and subcategory
            const categoryExists = await validateCategory(productData.category, productData.subcategory);
            if (!categoryExists) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Category or subcategory not found' }),
                };
            }

            updateExpression += '#category = :category, ';
            expressionAttributeNames['#category'] = 'category';
            expressionAttributeValues[':category'] = productData.category.toUpperCase();
            updateFbData.category = productData.category.toUpperCase();
        }

        if (productData.subcategory) {
            updateExpression += '#subcategory = :subcategory, ';
            expressionAttributeNames['#subcategory'] = 'subcategory';
            expressionAttributeValues[':subcategory'] = productData.subcategory.toUpperCase();
            updateFbData.subcategory = productData.subcategory.toUpperCase();
        }

        if (productData.about) {
            updateExpression += '#about = :about, ';
            expressionAttributeNames['#about'] = 'about';
            expressionAttributeValues[':about'] = productData.about;
            updateFbData.about = productData.about;
        }

        // Remove the trailing comma and space from the update expression
        updateExpression = updateExpression.slice(0, -2);
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        updateExpression += ', #updatedAt = :updatedAt';

        // Update the product in DynamoDB
        const updateParams = {
            TableName: tableName,
            Key: { id: productData.id },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        };

        const product = {
            access_token: ACCESS_TOKEN,
            requests: [
                {
                    method: 'UPDATE',
                    retailer_id: productData.id,
                    data: updateFbData
                }
            ]
        };

        console.log('Sending update request to Facebook Graph API:', product.requests[0].data);

        // Make a request to Facebook Graph API
        await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`, product);

        const updatedProduct = await dynamoDB.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Product updated successfully', updatedProduct }),
        };
    } catch (error) {
        console.error('Failed to update product:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update product', error: error.message }),
        };
    }
};

async function calculateUnitPrices(price, savings) {
    const units = [250, 500, 1000]; // Units for grams
    const unitPrices = units.map(unit => {
        const unitPrice = Math.round((price / 1000) * unit); // Convert price per kg to price per gram
        const unitSavings = Math.round((savings / 1000) * unit); // Convert savings per kg to savings per gram
        const discountedPrice = unitPrice - unitSavings;

        return {
            qty: unit,
            mrp: unitPrice,
            savings: unitSavings,
            price: discountedPrice
        };
    });

    return unitPrices;
}
