const axios = require('axios');
const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const API_URL = 'https://9ti4fcd117.execute-api.ap-south-1.amazonaws.com/product/';

const FACEBOOK_ACCESS_TOKEN = "EAALR8QvTSnIBO92ejWVEZAw2MWRZAHOetTYoBEhqRp4u9xqROJNYnrOr81BYULGtI57TD7xEeABH56wwZAUXePyJHMydFz34ZCKcGzMoMUwRxvROnP9ZBImZBNeRXzHhTug8VlCZB2Sg7iFz93YdF9CZCTTsC8xMH2B3Uq0Vwj9EeR8ZAApYzI1w0grlZAp4sAxFqZA2AZDZD";
const CATALOG_ID = "801561144856518";
const FACEBOOK_GRAPH_API_URL = "https://graph.facebook.com/v18.0";
async function getProductFromCommerceManager() {
	try {
		const response = await fetch(
			`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products?access_token=${FACEBOOK_ACCESS_TOKEN}`
		);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		console.error(
			"Error fetching product from Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function createProductInCommerceManager(variant) {
	try {
		const response = await fetch(
			`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/products`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					...variant,
					access_token: FACEBOOK_ACCESS_TOKEN,
				}),
			}
		);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log("Created product:", data);
		return data;
	} catch (error) {
		console.error(
			"Error creating product in Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function updateProductInCommerceManager(productData, updateFbData) {
	try {
		const product = {
			access_token: FACEBOOK_ACCESS_TOKEN,
			requests: [
				{
					method: "UPDATE",
					retailer_id: productData.retailer_id,
					data: updateFbData,
				},
			],
		};

		const response = await fetch(
			`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(product),
			}
		);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		console.log("Updated product:", data);
		return data;
	} catch (error) {
		console.error(
			"Error updating product in Commerce Manager:",
			error.message
		);
		throw error;
	}
}

async function fetchProducts(event) {
	console.log("Received event:", JSON.stringify(event, null, 2));
	try {
		const response = await fetch(`${API_URL}${event.id}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const product = await response.json(); // Assumes multiple products are fetched

		const variants = [];
		console.log("Products:", product);

		// for (const product of products) {
			// Handling products with unitPrices (e.g., sold in KG)
			if (product.unit === "kgs" && Array.isArray(product.unitPrices)) {
				for (const unitPrice of product.unitPrices) {
					const variant = {
						retailer_id: product.id,
						availability: "in stock",
						brand: product.brand || "Default Brand",
						category: product.category.toLowerCase(),
						subcategory: product.subCategory || "",
						description:
							product.description || "Fresh Fruits and vegetables",
						url: product.image,
						image_url: product.image,
						name: `${product.name} - ${unitPrice.qty} kg`,
						price: (unitPrice.price * 100).toFixed(0),
						currency: product.currency || "INR",
						options: [{ name: "Weight", value: `${unitPrice.qty} kg` }],
						productIDForEcom: product.id,
					};
					variants.push(variant);
					console.log("Generated variant:", variant);
				}
			}
			// Handling products sold in pieces
			else if (product.unit === "pieces" || product.unit === "pcs") {
				const variant = {
					retailer_id: product.id,
					availability: "in stock",
					brand: product.brand || "Default Brand",
					category: product.category.toLowerCase(),
					subcategory: product.subCategory || "",
					description:
						product.description || "Fresh Fruits and vegetables",
					image_url: product.image,
					url: product.image,
					name: product.name,
					price: product.unitPrices?.[0]?.price
						? (product.unitPrices[0].price * 100).toFixed(0)
						: "0", // Use first unitPrice if available or fallback to 0
					currency: product.currency || "INR",
					options: [{ name: "Quantity", value: "1 Piece" }],
					productIDForEcom: product.id,
				};
				variants.push(variant);
				console.log("Generated variant:", variant);
			}

			// Create or Update each variant in Facebook Commerce Manager
			if (variants.length > 0) {
				for (const variant of variants) {
					const existingProducts = await getProductFromCommerceManager();
					console.log("Existing products:", existingProducts);

					const existingProduct = existingProducts.data.find(
						(product) => product.retailer_id === variant.retailer_id
					);

					if (existingProduct) {
						const updateFbData = {
							name: variant.name,
							price: variant.price,
							availability: variant.availability,
							currency: variant.currency,
							// Include other fields as necessary
						};
						await updateProductInCommerceManager(
							existingProduct,
							updateFbData
						);
						console.log(`Product ${variant.retailer_id} updated.`);
					} else {
                        console.log(variant)
						await createProductInCommerceManager(variant);
						console.log(`Product ${variant.retailer_id} created.`);
					}
				}
			} else {
				console.log("No variants to upload.");
			}
		// }
	} catch (error) {
		console.error("Error fetching products:", error);
	}
}

fetchProducts({ id: 'df5527e4-ec01-4498-8930-5d8be95f1c47' }); // Example event
