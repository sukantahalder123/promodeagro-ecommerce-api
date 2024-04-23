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

    const updateFbData = {

    }

    // Check if ID is provided
    if (!productData.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required field: id' }),
      };
    }

    const tableName = 'Product-hxojpgz675cmbad5uyoeynwh54-dev';

    // Prepare update expression and attribute values for DynamoDB update
    let updateExpression = 'SET ';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};


    // Update the price field if provided
    if (productData.price) {
      updateExpression += '#price = :price, ';
      expressionAttributeNames['#price'] = 'price';
      expressionAttributeValues[':price'] = productData.price;
      updateFbData.price = productData.price
    }

    // Update other fields if provided
    if (productData.name) {
      updateExpression += '#name = :name, ';
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = productData.name;
      updateFbData.name = productData.name;
    }

    if (productData.image) {
      // Upload image to S3
      const s3params = {
        Bucket: 'posdmsservice',
        Key: productData.name + productData.category, // Adjust this as per your requirement
        Body: Buffer.from(productData.image, 'base64'),
        ContentType: 'image/png'
      };
      const uploadResult = await s3.upload(s3params).promise();
      const publicUrl = uploadResult.Location;

      updateExpression += '#image = :image, ';
      expressionAttributeNames['#image'] = 'image';
      expressionAttributeValues[':image'] = productData.image;
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


    console.log("dataaaa", updateFbData)
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
