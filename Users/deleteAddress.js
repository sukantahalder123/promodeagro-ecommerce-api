const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to check if user exists
async function checkUserExists(userId) {
    const params = {
        TableName: 'Users', // Replace with your actual Users table name
        Key: {
            UserId: userId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return !!data.Item; // Returns true if user exists, false otherwise
    } catch (error) {
        console.error('Error checking user existence:', error);
        throw error;
    }
}

// Function to check if address exists for the user
async function checkAddressExists(userId, addressId) {
    const params = {
        TableName: 'Addresses',
        Key: {
            userId: userId,
            addressId: addressId,
        },
    };

    try {
        const data = await docClient.get(params).promise();
        return !!data.Item; // Returns true if address exists for the user, false otherwise
    } catch (error) {
        console.error('Error checking address existence:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId, addressId } = JSON.parse(event.body);

    if (!userId || !addressId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    try {
        // Check if user exists
        const userExists = await checkUserExists(userId);

        if (!userExists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        // Check if address exists for the user
        const addressExists = await checkAddressExists(userId, addressId);

        if (!addressExists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Address not found for the user" }),
            };
        }

        const params = {
            TableName: 'Addresses',
            Key: {
                userId: userId,
                addressId: addressId,
            },
        };

        await docClient.delete(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Address deleted successfully" }),
        };
    } catch (error) {
        console.error('Error deleting address:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
