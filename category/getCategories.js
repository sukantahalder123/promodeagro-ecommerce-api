// const AWS = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
// require('dotenv').config();

// const client = new AWS.DynamoDBClient();
// const docClient = DynamoDBDocumentClient.from(client);

// const CATEGORY_BASE_URL = 'https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/';
// const SUBCATEGORY_BASE_URL = 'https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/subCategories/';

// const getCategoryImageUrl = (category) => {
//   return `${CATEGORY_BASE_URL}${encodeURIComponent(category.replace(/\s+/g, '_').toLowerCase())}.png`;
// };

// const getSubcategoryImageUrl = (subCategory) => {
//   return `${SUBCATEGORY_BASE_URL}${encodeURIComponent(subCategory)}.png`;
// };

// const CATEGORY_ORDER = [
//   'Bengali Special',
//   'Fresh Vegetables',
//   'Fresh Fruits',
//   'Groceries',
//   'Dairy',
// ];

// exports.handler = async (event) => {
//   const params = {
//     TableName: process.env.PRODUCTS_TABLE,
//     ProjectionExpression: "#category, #subCategory",
//     ExpressionAttributeNames: {
//       "#category": "category",
//       "#subCategory": "subCategory"
//     }
//   };

//   try {
//     const data = await docClient.send(new ScanCommand(params));
//     const products = data.Items;

//     const categoryMap = {};

//     products.forEach(product => {
//       if (!product.category || product.category.trim() === 'Eggs Meat & Fish') return;

//       const normalizedCategory = product.category.trim().toLowerCase();
//       const subCategory = product.subCategory ? product.subCategory.trim() : null;

//       if (!categoryMap[normalizedCategory]) {
//         categoryMap[normalizedCategory] = {
//           originalName: product.category,
//           subCategories: new Set(),
//         };
//       }

//       if (subCategory) {
//         categoryMap[normalizedCategory].subCategories.add(subCategory);
//       }
//     });

//     const categories = Object.keys(categoryMap).map(normalizedCategory => {
//       const { originalName, subCategories } = categoryMap[normalizedCategory];

//       return {
//         CategoryName: originalName,
//         image_url: getCategoryImageUrl(originalName),
//         Subcategories: Array.from(subCategories).map(subCategory => ({
//           name: subCategory,
//           image_url: getSubcategoryImageUrl(subCategory)
//         }))
//       };
//     });

//     categories.sort((a, b) => {
//       const indexA = CATEGORY_ORDER.indexOf(a.CategoryName);
//       const indexB = CATEGORY_ORDER.indexOf(b.CategoryName);
//       return indexA - indexB;
//     });

//     categories.forEach(category => {
//       category.Subcategories.sort((a, b) => a.name.localeCompare(b.name));
//     });

//     return {
//       statusCode: 200,
//       body: JSON.stringify(categories),
//     };
//   } catch (error) {
//     console.error('Error fetching categories and subcategories:', error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
//     };
//   }
// };



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
  return `${SUBCATEGORY_BASE_URL}${encodeURIComponent(subCategory)}.png`;
};

// Predefined category order
const CATEGORY_ORDER = [
  'Bengali Special',
  'Fresh Vegetables',
  'Fresh Fruits',
  'Groceries',
  'Eggs Meat & Fish',
  'Dairy',
];

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
      if (!product.category) return; // Skip if category is missing

      const normalizedCategory = product.category.trim().toLowerCase(); // Normalize category
      const subCategory = product.subCategory ? product.subCategory.trim() : null;

      if (!categoryMap[normalizedCategory]) {
        categoryMap[normalizedCategory] = {
          originalName: product.category, // Store original case-sensitive name
          subCategories: new Set(),
        };
      }

      // Add subcategory to the category
      if (subCategory) {
        categoryMap[normalizedCategory].subCategories.add(subCategory);
      }
    });

    // Convert categoryMap to an array of objects with dynamic image URLs for categories and subcategories
    const categories = Object.keys(categoryMap).map(normalizedCategory => {
      const { originalName, subCategories } = categoryMap[normalizedCategory];

      return {
        CategoryName: originalName,
        image_url: getCategoryImageUrl(originalName),
        Subcategories: Array.from(subCategories).map(subCategory => ({
          name: subCategory,
          image_url: getSubcategoryImageUrl(subCategory)
        }))
      };
    });

    // Sort categories according to predefined order
    categories.sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a.CategoryName);
      const indexB = CATEGORY_ORDER.indexOf(b.CategoryName);
      return indexA - indexB;
    });

    // Sort subcategories alphabetically
    categories.forEach(category => {
      category.Subcategories.sort((a, b) => a.name.localeCompare(b.name));
    });

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

