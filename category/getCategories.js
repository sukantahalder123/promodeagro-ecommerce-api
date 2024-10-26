'use strict';

const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

// Base URLs for categories and subcategories
const CATEGORY_BASE_URL = 'https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/';
const SUBCATEGORY_BASE_URL = 'https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/subCategories/';

// Function to generate category image URL
const getCategoryImageUrl = (category) => {
  return `${CATEGORY_BASE_URL}${encodeURIComponent(category.replace(/\s+/g, '_').toLowerCase())}.png`;
};

// Function to generate subcategory image URL
const getSubcategoryImageUrl = (subCategory) => {
  return `${SUBCATEGORY_BASE_URL}${encodeURIComponent(subCategory.replace(/\s+/g, '_').toLowerCase())}.jpg`;
};

exports.handler = async (event) => {
  const params = {
    TableName: process.env.PRODUCTS_TABLE,
    ProjectionExpression: "#category, #subCategory",
    ExpressionAttributeNames: {
      "#category": "category",
      "#subCategory": "subCategory"
    }
  };

  try {
    // Scan the table to get all products
    const data = await docClient.send(new ScanCommand(params));
    const products = data.Items;

    // Object to hold the categories and subcategories
    const categoryMap = {};

    // Loop through all products and group subcategories under categories
    products.forEach(product => {
      const category = product.category;
      const subCategory = product.subCategory;

      if (category) {
        // If the category does not exist in the map, create an entry for it
        if (!categoryMap[category]) {
          categoryMap[category] = new Set();  // Using Set to avoid duplicate subcategories
        }

        // Add subcategory to the category in the map
        if (subCategory) {
          categoryMap[category].add(subCategory);
        }
      }
    });

    // Convert categoryMap to an array of objects with dynamic image URLs for categories and subcategories
    const categories = Object.keys(categoryMap).map(category => ({
      CategoryName: category,
      image_url: getCategoryImageUrl(category),
      Subcategories: Array.from(categoryMap[category]).map(subCategory => ({
        name: subCategory,
        image_url: getSubcategoryImageUrl(subCategory)
      }))
    }));

    // Sort categories and subcategories alphabetically (optional)
    categories.forEach(category => {
      category.Subcategories.sort((a, b) => a.name.localeCompare(b.name));
    });
    categories.sort((a, b) => a.CategoryName.localeCompare(b.CategoryName));

    return {
      statusCode: 200,
      body: JSON.stringify(categories),
    };
  } catch (error) {
    console.error('Error fetching categories and subcategories:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
    };
  }
};
