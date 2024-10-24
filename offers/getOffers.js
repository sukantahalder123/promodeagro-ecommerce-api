'use strict';

exports.handler = async (event) => {
    try {
        // Hardcoded data
        const offers = [
            {
                imageUrl: "https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/bengali_special.jpg",
                category: "Bengali Special",
                subCategory: "Bengali Vegetables",
                filters: {
                    minPrice: 10,
                    maxPrice: 100,
                    discounts: 5
                }
            },
            {
                imageUrl: "https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/dairy.jpg",
                category: "Dairy",
                subCategory: "Butter & Ghee",
                filters: {
                    minPrice: 50,
                    maxPrice: 300,
                    discounts: 10
                }
            },
            {
                imageUrl: "https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/fresh_fruits.jpg",
                category: "Fresh Fruits",
                subCategory: "Exotic Fruits",
                filters: {
                    minPrice: 20,
                    maxPrice: 200,
                    discounts: 15
                }
            },
            {
                imageUrl: "https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/eggs_meat_%26_fish.jpg",
                category: "Eggs Meat & Fish",
                subCategory: "Chicken",
                filters: {
                    minPrice: 100,
                    maxPrice: 500,
                    discounts: 8
                }
            },
            {
                imageUrl: "https://promodeagro-images-prod-ui-root.s3.us-east-1.amazonaws.com/categories/groceries.jpg",
                category: "Groceries",
                subCategory: "Cooking Oil",
                filters: {
                    minPrice: 30,
                    maxPrice: 150,
                    discounts: 12
                }
            }
        ];

        return {
            statusCode: 200,
            body: JSON.stringify(offers),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Enable CORS
            },
        };
    } catch (error) {
        console.error('Failed to fetch offers:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch offers', error: error.message }),
        };
    }
};
