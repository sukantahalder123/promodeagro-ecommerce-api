const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

const USERS_TABLE = process.env.USERS_TABLE;

exports.handler = async (event) => {
    try {
        // Extract userId from the path parameters
        const userId = event.pathParameters.userId;

        if (!userId) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'User ID is required', statusCode: 400, }),
            };
        }

        // Parameters for deleting the user
        const deleteParams = {
            TableName: USERS_TABLE,
            Key: {
                UserId: userId,
            },
            ConditionExpression: 'attribute_exists(UserId)', // Ensure the user exists before deleting
        };

        await dynamoDB.delete(deleteParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User deleted successfully' ,statusCode: 200}),
        };
    } catch (error) {
        console.error('Error deleting user:', error);
        let statusCode = 500;
        let message = 'Failed to delete user';

        if (error.code === 'ConditionalCheckFailedException') {
            statusCode = 404;
            message = 'User not found';
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: message, error: error, statusCode:statusCode }),
        };
    }
};
