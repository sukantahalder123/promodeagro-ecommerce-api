
const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();



exports.handler = async (event) => {
    const { userId, oldPassword, newPassword } = JSON.parse(event.body);

    if (!userId || !oldPassword || !newPassword) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    // Get user details
    const userParams = {
        TableName: 'Users',
        Key: {
            id: userId,
        },
    };

    try {
        const user = await docClient.get(userParams).promise();

        if (!user.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
        if (user.Item.PasswordHash !== oldPasswordHash) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Old password is incorrect" }),
            };
        }

        const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        const updateParams = {
            TableName: 'Users',
            Key: {
                id: userId,
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
