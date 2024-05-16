const axios = require('axios');
require('dotenv').config();
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
const CATALOG_ID = process.env.CATALOG_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}

module.exports.handler = async (event) => {
    try {
        // Input validation
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing request body' }),
            };
        }

        const requiredFields = ['name', 'price', 'image', 'description', 'unit', 'category', 'availability', 'brand', 'currency'];
        const productData = JSON.parse(event.body);

        for (const field of requiredFields) {
            if (!(field in productData)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `Missing required field: ${field}` }),
                };
            }
        }

        const tableName = 'Products';

        const s3params = {
            Bucket: 'ecomdmsservice',
            Key: productData.name + productData.category,
            Body: Buffer.from(productData.image, 'base64'),
            ContentType: 'image/png'
        };

        const uploadResult = await s3.upload(s3params).promise();
        const publicUrl = uploadResult.Location;

        const newProduct = {
            id: generateUniqueId(),
            name: productData.name,
            price: productData.price,
            image: publicUrl,
            description: productData.description,
            unit: productData.unit.toUpperCase(),
            category: productData.category.toUpperCase(),
            availability: productData.availability,
            createdAt: new Date().toISOString(),
            _version: 1,
            _lastChangedAt: Date.now(),
            _deleted: false,
            updatedAt: new Date().toISOString(),
        };

        try {
            const response = await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products?access_token=${ACCESS_TOKEN}`, {
                retailer_id: newProduct.id,
                availability: productData.availability,
                brand: productData.brand,
                category: newProduct.category.toUpperCase(),
                description: newProduct.description,
                image_url: newProduct.image,
                name: newProduct.name,
                price: newProduct.price,
                currency: productData.currency,
                url: newProduct.image
            });



            const putParams = {
                TableName: tableName,
                Item: newProduct,
            };
            if (response.status === 200) {

                await dynamoDB.put(putParams).promise();
            }


            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Product created successfully', newProduct }),
            };
        } catch (error) {
            console.error('Failed to create product in Facebook catalog:', error.response ? error.response.data : error.message);
            return {
                statusCode: error.response ? error.response.status : 500,
                body: JSON.stringify({ message: 'Failed to create product in Facebook catalog', error: error.response ? error.response.data : error.message }),
            };
        }
    } catch (error) {
        console.error('Failed to create product:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create product', error: error.message }),
        };
    }
};