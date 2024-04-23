
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();
const axios = require('axios');

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}

const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
const CATALOG_ID = process.env.CATALOG_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

exports.handler = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event, null, 2));

        const tableName = process.env.PRODUCT_TABLE;

        switch (event.fieldName) {

            case 'createProduct':
                const { input } = event.arguments;
                console.log(input);

                if (!input) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Missing request body' }),
                    };
                }

                const requiredFields = ['name', 'price', 'image', 'description', 'unit', 'category', 'availability', 'brand', 'currency'];

                for (const field of requiredFields) {
                    if (!(field in input)) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ message: `Missing required field: ${field}` }),
                        };
                    }
                }


                const s3params = {
                    Bucket: 'posdmsservice',
                    Key: input.name + input.category,
                    Body: Buffer.from(input.image, 'base64'),
                    ContentType: 'image/png'
                };

                const uploadResult = await s3.upload(s3params).promise();
                const publicUrl = uploadResult.Location;

                const newProduct = {
                    id: generateUniqueId(),
                    name: input.name,
                    price: input.price,
                    image: publicUrl,
                    description: input.description,
                    unit: input.unit.toUpperCase(),
                    category: input.category.toUpperCase(),
                    availability: input.availability,
                    createdAt: new Date().toISOString(),
                    _version: 1,
                    _lastChangedAt: Date.now(),
                    _deleted: false,
                    updatedAt: new Date().toISOString(),
                };

                try {
                    const response = await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products?access_token=${ACCESS_TOKEN}`, {
                        retailer_id: newProduct.id,
                        availability: input.availability,
                        brand: input.brand,
                        category: newProduct.category.toUpperCase(),
                        description: newProduct.description,
                        image_url: newProduct.image,
                        name: newProduct.name,
                        price: newProduct.price,
                        currency: input.currency,
                        url: newProduct.image
                    });



                    const putParams = {
                        TableName: tableName,
                        Item: newProduct,
                    };
                    if (response.status === 200) {

                        await dynamoDB.put(putParams).promise();
                    }


                    return newProduct
                } catch (error) {
                    console.error('Failed to create product in Facebook catalog:', error.response ? error.response.data : error.message);
                    return {
                        statusCode: error.response ? error.response.status : 500,
                        body: JSON.stringify({ message: 'Failed to create product in Facebook catalog', error: error.response ? error.response.data : error.message }),
                    };
                }
            case 'listProducts':
                const params = {
                    TableName: tableName,
                };

                const result = await dynamoDB.scan(params).promise();
                const product = result.Items;
                return {
                    items: product,
                };

            case 'syncProducts':
                const param = {
                    TableName: tableName,
                };

                const results = await dynamoDB.scan(param).promise();
                const products = results.Items;
                return {
                    items: products,
                };


            case 'getProduct':
                const { id } = event.arguments; // Extract 'id' from input
                const getParams = {
                    TableName: tableName,
                    Key: {
                        id: id,
                    },
                };

                const getResult = await dynamoDB.get(getParams).promise();
                console.log(getResult)
                const getProduct = getResult.Item;
                return getProduct

            case 'updateProduct':
                const updateInput = event.arguments.input;
                console.log(updateInput)
                const updateFbData = {

                }

                // Check if ID is provided
                if (!updateInput.id) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Missing required field: id' }),
                    };
                }


                // Prepare update expression and attribute values for DynamoDB update
                let updateExpression = 'SET ';
                const expressionAttributeValues = {};
                const expressionAttributeNames = {};


                // Update the price field if provided
                if (updateInput.price) {
                    updateExpression += '#price = :price, ';
                    expressionAttributeNames['#price'] = 'price';
                    expressionAttributeValues[':price'] = updateInput.price;
                    updateFbData.price = updateInput.price
                }

                // Update other fields if provided
                if (updateInput.name) {
                    updateExpression += '#name = :name, ';
                    expressionAttributeNames['#name'] = 'name';
                    expressionAttributeValues[':name'] = updateInput.name;
                    updateFbData.name = updateInput.name;
                }

                if (updateInput.image) {
                    // Upload image to S3
                    const s3params = {
                        Bucket: 'posdmsservice',
                        Key: updateInput.name + updateInput.category, // Adjust this as per your requirement
                        Body: Buffer.from(updateInput.image, 'base64'),
                        ContentType: 'image/png'
                    };
                    const uploadResult = await s3.upload(s3params).promise();
                    const publicUrl = uploadResult.Location;

                    updateExpression += '#image = :image, ';
                    expressionAttributeNames['#image'] = 'image';
                    expressionAttributeValues[':image'] = publicUrl;
                    updateFbData.image_url = publicUrl;
                }

                if (updateInput.description) {
                    updateExpression += '#description = :description, ';
                    expressionAttributeNames['#description'] = 'description';
                    expressionAttributeValues[':description'] = updateInput.description;
                    updateFbData.description = updateInput.description;
                }
                if (updateInput.unit) {
                    updateExpression += '#unit = :unit, ';
                    expressionAttributeNames['#unit'] = 'unit';
                    expressionAttributeValues[':unit'] = updateInput.unit.toUpperCase();
                }
                if (updateInput.category) {
                    updateExpression += '#category = :category, ';
                    expressionAttributeNames['#category'] = 'category';
                    expressionAttributeValues[':category'] = updateInput.category.toUpperCase();
                    updateFbData.category = updateInput.category.toUpperCase();
                }

                // Remove the trailing comma and space from the update expression
                updateExpression = updateExpression.slice(0, -2);
                expressionAttributeValues[':updatedAt'] = new Date().toISOString();
                expressionAttributeNames['#updatedAt'] = 'updatedAt';
                updateExpression += ', #updatedAt = :updatedAt';

                // Update the product in DynamoDB
                const updateParams = {
                    TableName: tableName,
                    Key: { id: updateInput.id },
                    UpdateExpression: updateExpression,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                };


                console.log("dataaaa", updateFbData)
                const updateproduct = {
                    access_token: ACCESS_TOKEN,
                    requests: [
                        {
                            method: 'UPDATE',
                            retailer_id: updateInput.id,
                            data: updateFbData
                        }
                    ]
                };

                console.log('Sending update request to Facebook Graph API:', updateproduct);

                // Make a request to Facebook Graph API
                await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`, updateproduct);



                const updatedProduct = await dynamoDB.update(updateParams).promise();
                console.log(updatedProduct)

                return updateInput;


            default:
                throw new Error(`Unknown field, unable to resolve ${event.fieldName}`);
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to process request');
    }
};
