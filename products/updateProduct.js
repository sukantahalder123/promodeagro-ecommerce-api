const axios = require('axios');
require('dotenv').config();
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
const CATALOG_ID = process.env.CATALOG_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

module.exports.handler = async (event) => {
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

    const tableName = 'Products';

    // Prepare update expression and attribute values for DynamoDB update
    let updateExpression = 'SET ';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // Update the price field if provided
    if (productData.price) {
      // Convert price to an integer (e.g., cents for USD)
      const priceInCents = Math.round(productData.price * 100);

      updateExpression += '#price = :price, ';
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':price'] = priceInCents;
      updateFbData.price = priceInCents;
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
      updateExpression += '#category = :category, ';
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeValues[':category'] = productData.category.toUpperCase();
      updateFbData.category = productData.category.toUpperCase();
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
