const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { productId, grams, userId } = JSON.parse(event.body); // Input: productId, grams (e.g., 250), and userId

    console.log(productId);

    // Check if the user exists in the Users table
    const userParams = {
        TableName: 'Users', // Replace with your Users table name
        Key: {
            UserId: userId,  // Assuming `UserId` is the primary key in your Users table
        },
    };

    try {
        const userResult = await dynamoDb.get(userParams).promise();

        console.log('User Result:', userResult);

        // If the user is not found, return a 404 response
        if (!userResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "User not found",
                }),
            };
        }

        // Fetch the product details from the Products table
        const params = {
            TableName: 'Products', // Replace with your Products table name
            Key: { id: productId }, // Assuming `id` is the primary key in your table
        };

        console.log(params);
        const result = await dynamoDb.get(params).promise();
        const product = result.Item;

        console.log('Product Result:', result);

        if (!product) {
            return { statusCode: 404, body: "Product not found" };
        }

        // Find the matching qty in unitPrices array
        const matchingUnit = product.unitPrices.find(unit => unit.qty === grams);

        if (matchingUnit) {
            // Update the product's price in the Products table
            const updateParams = {
                TableName: 'Products',
                Key: { id: productId },
                UpdateExpression: 'set price = :price',
                ExpressionAttributeValues: {
                    ':price': matchingUnit.price,
                },
                ReturnValues: 'UPDATED_NEW',
            };
            console.log('Update Params:', updateParams);

            await dynamoDb.update(updateParams).promise();

            // Remove the item from the cart
            const removeParams = {
                TableName: 'CartItems', // Replace with your CartItems table name
                Key: {
                    UserId: userId,
                    ProductId: productId
                },
            };

            await dynamoDb.delete(removeParams).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Price updated successfully and item removed from cart',
                    updatedPrice: matchingUnit.price,
                }),
            };
        } else {
            return { statusCode: 404, body: "Matching quantity not found" };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error updating price',
                error: error.message,
            }),
        };
    }
};
