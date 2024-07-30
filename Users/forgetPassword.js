const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { mobileNumber, newPassword } = JSON.parse(event.body);

    // Check for missing fields
    if (!mobileNumber || !newPassword) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Missing required fields"  , statusCode: 400
        }),
        };
    }

    // Ensure mobileNumber is a valid format (basic validation)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Invalid mobile number format" ,  statusCode: 400        }),
        };
    }

    // Hash the new password
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Define DynamoDB query parameters to find the user by mobile number
    const queryParams = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'MobileNumber-index', // Make sure you have a GSI on MobileNumber
        KeyConditionExpression: 'MobileNumber = :mobileNumber',
        ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
        },
    };

    try {
        // Query DynamoDB
        const data = await docClient.query(queryParams).promise();
        const user = data.Items[0];

        if (!user) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "User not found" , statusCode: 404}),
            };
        }

        // Update the user's password
        const updateParams = {
            TableName: process.env.USERS_TABLE,
            Key: {
                UserId: user.UserId,
            },
            UpdateExpression: 'set PasswordHash = :passwordHash',
            ExpressionAttributeValues: {
                ':passwordHash': newPasswordHash,
            },
        };

        await docClient.update(updateParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Password updated successfully" ,statusCode: 200,        }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
