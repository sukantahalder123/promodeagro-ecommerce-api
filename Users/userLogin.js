const AWS = require('aws-sdk');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

exports.handler = async (event) => {
    const { mobileNumber, password } = JSON.parse(event.body);

    // Check for missing fields
    if (!mobileNumber || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    // Ensure mobileNumber is a valid format (basic validation)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Invalid mobile number format" }),
        };
    }

    // Hash the provided password
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Define DynamoDB query parameters
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'MobileNumber-index', // Specify the index name here
        KeyConditionExpression: 'MobileNumber = :mobileNumber',
        ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
        },
    };

    try {
        // Query DynamoDB
        const data = await docClient.query(params).promise();
        const user = data.Items[0];

        // Check if user exists and passwords match
        if (user && user.PasswordHash === passwordHash) {
            // Generate a secret key for JWT signing (not stored)
            const secretKey = crypto.randomBytes(64).toString('hex');
            
            // Generate a JWT token using the generated secret key
            const token = jwt.sign({ userId: user.UserId, name: user.Name }, secretKey, { expiresIn: '1h' });
            
            // Return the token in the response
            return {
                statusCode: 200,
                body: JSON.stringify({ token: token, userId: user.UserId, name: user.Name }),
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Invalid mobile number or password" }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
