// Import required AWS SDK clients and commands
const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient(); // Specify your AWS region

// Function to generate a random savings percentage between 5 and 30 (as an integer)
const getRandomSavingsPercentage = () => {
    const min = 5;
    const max = 30;
    return Math.floor(Math.random() * (max - min + 1)) + min; // Returns a whole number between 5 and 30
};

// Function to update all products with a random savingsPercentage
const updateRandomSavingsPercentageForAllProducts = async () => {
    try {
        // Step 1: Scan the products table to get all items
        const scanParams = {
            TableName: "prod-promodeagro-admin-productsTable", // Replace with your table name
        };
        const scanCommand = new ScanCommand(scanParams);
        const products = await client.send(scanCommand);

        // Step 2: Loop through each product and update with a random savingsPercentage
        for (const product of products.Items) {
            // Generate a random savings percentage
            const randomSavingsPercentage = getRandomSavingsPercentage();

            // Step 3: Update the product with the new random savingsPercentage
            const updateParams = {
                TableName: "prod-promodeagro-admin-productsTable", // Replace with your table name
                Key: {
                    "id": product.id, // Changed from productId to id
                },
                UpdateExpression: "SET savingsPercentage = :savings",
                ExpressionAttributeValues: {
                    ":savings": { N: randomSavingsPercentage.toString() }, // Save as a string for DynamoDB
                },
            };

            const updateCommand = new UpdateItemCommand(updateParams);
            await client.send(updateCommand);
            console.log(`Updated product ${product.id.S} with random savingsPercentage ${randomSavingsPercentage}`);
        }
    } catch (error) {
        console.error("Error updating savingsPercentage:", error);
    }
};

// Run the function
updateRandomSavingsPercentageForAllProducts();
