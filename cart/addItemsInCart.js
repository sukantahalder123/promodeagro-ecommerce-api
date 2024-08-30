const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to fetch product details from DynamoDB
async function getProductDetails(productId) {
    const params = {
        TableName: 'Products',
        Key: {
            id: productId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
    }
}

// Function to check if the user exists in the Users table
async function getUserDetails(userId) {
    const params = {
        TableName: 'Users',
        Key: {
            UserId: userId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return data.Item;
    } catch (error) {
        console.error('Error fetching user details:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId, productId, quantity, quantityUnits } = JSON.parse(event.body);

    if (!userId || !productId || !quantity || !quantityUnits) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    try {
        // Check if the user exists
        const user = await getUserDetails(userId);

        if (!user) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        // Fetch product details
        const product = await getProductDetails(productId);

        if (!product) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Product not found" }),
            };
        }

        let unitPrice;
        let price, mrp, savings, subtotal;

        if (product.unit.toUpperCase() === 'GRAMS') {
            // Find the appropriate unit price based on quantityUnits for KG
            for (let i = product.unitPrices.length - 1; i >= 0; i--) {
                if (quantityUnits === product.unitPrices[i].qty) {
                    unitPrice = product.unitPrices[i];
                    break;
                }
            }

            if (!unitPrice) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid quantity units for KG" }),
                };
            }

            price = parseFloat(unitPrice.price);
            mrp = parseFloat(unitPrice.mrp);
            savings = parseFloat((unitPrice.savings * quantity).toFixed(2));
            subtotal = parseFloat((price * quantity).toFixed(2));

        } else if (product.unit.toUpperCase() === 'PCS') {
            // For PCS, we assume there's a single price for each piece
            if (!product.price || !product.mrp) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid product pricing for PCS" }),
                };
            }

            price = parseFloat(product.price);
            mrp = parseFloat(product.mrp);
            savings = parseFloat(((mrp - price) * quantity).toFixed(2));
            subtotal = parseFloat((price * quantity).toFixed(2));

        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid product unit" }),
            };
        }

        // Prepare the item to be stored in the CartItems table
        const params = {
            TableName: 'CartItems',
            Item: {
                UserId: userId,
                productName: product.name,
                productImage: product.image,
                ProductId: productId,
                Quantity: quantity, // Store the original quantity in units (e.g., 10 units)
                QuantityUnits: quantityUnits, // Store the quantity units (e.g., 500 grams)
                Savings: savings,
                Price: price,
                category:product.category,
                subcategory:product.subcategory,
                Subtotal: subtotal,
                Mrp: mrp
            },
        };

        await docClient.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item added to cart successfully", subtotal }),
        };
    } catch (error) {
        console.error('Error adding item to cart:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
