const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { userId, oldPassword, newPassword } = JSON.parse(event.body);

    if (!userId || !oldPassword || !newPassword) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Missing required fields", statusCode: 400, }),
        };
    }

    // Get user details by userId
    const userParams = {
        TableName: process.env.USERS_TABLE, // Make sure to use the correct table name from environment variables
        Key: {
            UserId: userId,
        },
    };

    try {
        const data = await docClient.get(userParams).promise();

        if (!data.Item) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "User not found", statusCode: 404, }),
            };
        }

        const user = data.Item;

        const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
        if (user.PasswordHash !== oldPasswordHash) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Old password is incorrect", statusCode: 401,
                }),
            };
        }

        const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

        // Check if old and new password hashes are the same
        if (user.PasswordHash === newPasswordHash) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "New password must be different from the old password", statusCode: 401,
                }),
            };
        }

        const updateParams = {
            TableName: process.env.USERS_TABLE, // Make sure to use the correct table name from environment variables
            Key: {
                UserId: user.UserId, // Replace with your primary key attribute name
            },
            UpdateExpression: 'set PasswordHash = :newPasswordHash',
            ExpressionAttributeValues: {
                ':newPasswordHash': newPasswordHash,
            },
            ReturnValues: 'UPDATED_NEW',
        };

        await docClient.update(updateParams).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Password changed successfully" }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
