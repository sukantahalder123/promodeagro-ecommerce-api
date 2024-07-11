const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { mobileNumber, oldPassword, newPassword } = JSON.parse(event.body);

    if (!mobileNumber || !oldPassword || !newPassword) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    // Get user details by mobile number
    const userParams = {
        TableName: 'Users',
        IndexName: 'MobileNumber-index', // Assuming there's an index on 'MobileNumber'
        KeyConditionExpression: 'MobileNumber = :mobileNumber',
        ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
        },
    };

    

    try {
        const data = await docClient.query(userParams).promise();

        if (data.Items.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "User not found" }),
            };
        }

        const user = data.Items[0]; // Assuming mobileNumber is unique

        const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
        if (user.PasswordHash !== oldPasswordHash) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Old password is incorrect" }),
            };
        }

        const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        const updateParams = {
            TableName: 'Users',
            Key: {
                UserId: user.UserId, // Replace with your primary key attribute name
            },
            UpdateExpression: 'set PasswordHash = :newPasswordHash',
            ExpressionAttributeValues: {
                ':newPasswordHash': newPasswordHash,
            },
            ReturnValues: 'UPDATED_NEW',
        };

        console.log(updateParams);

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
