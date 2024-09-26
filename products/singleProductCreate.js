const axios = require('axios');
const AWS = require('aws-sdk');
require('dotenv').config();

const API_URL = 'https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/product/ae5065bb-512b-44ed-99f6-cd787ffac74a?userId=17c79dd8-a172-4b15-9926-0a63196f0016';
// const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
// const CATALOG_ID = process.env.CATALOG_ID;
// const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

const FACEBOOK_ACCESS_TOKEN = "EAALR8QvTSnIBO92ejWVEZAw2MWRZAHOetTYoBEhqRp4u9xqROJNYnrOr81BYULGtI57TD7xEeABH56wwZAUXePyJHMydFz34ZCKcGzMoMUwRxvROnP9ZBImZBNeRXzHhTug8VlCZB2Sg7iFz93YdF9CZCTTsC8xMH2B3Uq0Vwj9EeR8ZAApYzI1w0grlZAp4sAxFqZA2AZDZD"
const CATALOG_ID = "801561144856518"
const FACEBOOK_GRAPH_API_URL = "https://graph.facebook.com/v18.0"

function generateUniqueId() {
    return Math.floor(Math.random() * Date.now()).toString();
}

async function createProductInCommerceManager(variant) {
    try {
        const url = `${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products?access_token=${FACEBOOK_ACCESS_TOKEN}`;
        console.log('Creating product at:', url);
        const response = await axios.post(url, variant);
        console.log('Product created successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating product in Commerce Manager:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function fetchSingleProduct() {
    try {
        const response = await axios.get(API_URL);
        const product = response.data; // Assuming you want the first product

        console.log(product)

        const variants = [];

        if (product.unit === 'grams' && product.unitPrices && product.unitPrices.length > 0) {
            for (const unitPrice of product.unitPrices) {
                const variant = {
                    retailer_id: generateUniqueId(),
                    availability: 'in stock', // Ensure this is a valid state

                    brand: product.brand || 'Default Brand',
                    category: product.category.toLowerCase(),
                    subcategory: product.subCategory || '',
                    description: 'Fresh Fruits and vegetables',
                    image_url: product.image,
                    url: product.image,
                    name: `${product.name} - ${unitPrice.qty}g`,
                    price: unitPrice.price, // Use the unit price
                    currency: 'INR',
                    options: [{ name: 'Weight', value: `${unitPrice.qty}g` }],
                    productIDForEcom: product.id
                };
                variants.push(variant);
            }
        } else if (product.unit === 'pieces') {
            const variant = {
                retailer_id: generateUniqueId(),
                availability: 'in stock', // Ensure this is a valid state
                brand: product.brand || 'Default Brand',
                category: product.category.toLowerCase(),
                subcategory: product.subCategory || '',
                description: 'Fresh Fruits and vegetables',
                image_url: product.image,
                url: product.url,
                name:  `${product.name} - ${unitPrice.qty} PCS`,
                price: unitPrice.price, // Use the unit price
                currency: 'INR',
                options: [{ name: 'Quantity', value: '1 Piece' }],
                productIDForEcom: product.id
            };
            variants.push(variant);
        }

        // Create each variant in Facebook Commerce Manager
        for (const variant of variants) {
            await createProductInCommerceManager(variant);
        }
    } catch (error) {
        console.error('Error fetching product:', error);
    }
}

// Execute the function to fetch a single product and create it in Commerce Manager
fetchSingleProduct();
