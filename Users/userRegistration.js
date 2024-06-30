const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { mobileNumber, password, name } = JSON.parse(event.body);
    
    if (!mobileNumber || !password || !name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    const userId = crypto.randomUUID();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const params = {
        TableName: 'Users',
        Item: {
            UserId: userId,
            MobileNumber: mobileNumber,
            PasswordHash: passwordHash,
            Name: name,
        },
    };

    try {
        await docClient.put(params).promise();
        return {
            statusCode: 201,
            body: JSON.stringify({ userId }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
};
