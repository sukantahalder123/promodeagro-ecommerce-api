const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to check if the user exists in the Users table
async function getUserDetails(userId) {
    const params = {
        TableName: 'Users',
        Key: {
            UserId: userId, // Assuming 'id' is the primary key for the Users table
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
    const userId = event.pathParameters.userId;

    if (!userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing userId in path parameters" }),
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

        const params = {
            TableName: 'CartItems',
            KeyConditionExpression: 'UserId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            }
        };

        const data = await docClient.query(params).promise();

        // Calculate subtotal and savings
        let subTotal = 0;
        let totalSavings = 0;

        data.Items.forEach(item => {
            subTotal += item.Subtotal || 0;
            totalSavings += item.Savings || 0;
        });

        const response = {
            statusCode: 200,
            body: JSON.stringify({
                items: data.Items,
                subTotal,
                savings: totalSavings,
            }),
        };

        return response;
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
