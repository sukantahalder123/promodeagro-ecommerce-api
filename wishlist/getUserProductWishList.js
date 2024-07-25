const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

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
    const { userId } = event.queryStringParameters;

    if (!userId) {
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

        // Query the ProductWishLists table
        const params = {
            TableName: 'ProductWishLists',
            KeyConditionExpression: 'UserId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        };

        const data = await docClient.query(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ wishlist: data.Items }),
        };
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
