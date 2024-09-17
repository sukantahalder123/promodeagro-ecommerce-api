'use strict';

const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

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

    // Convert categoryMap to an array of objects
    const categories = Object.keys(categoryMap).map(category => ({
      CategoryName: category,
      Subcategories: Array.from(categoryMap[category]) // Convert Set to Array
    }));

    // Sort categories and subcategories alphabetically (optional)
    categories.forEach(category => {
      category.Subcategories.sort();
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
