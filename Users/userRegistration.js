const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

// Function to check if a mobile number already exists
async function checkMobileNumberExists(mobileNumber) {
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'MobileNumber-index', // Assume you have a secondary index on MobileNumber
        KeyConditionExpression: 'MobileNumber = :mobileNumber',
        ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        return data.Count > 0;
    } catch (error) {
        console.error('Error checking mobile number:', error);
        throw error;
    }
}

// Function to check if a name already exists
async function checkNameExists(name) {
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'Name-index', // Assume you have a secondary index on Name
        KeyConditionExpression: '#nm = :name',
        ExpressionAttributeValues: {
            ':name': name,
        },
        ExpressionAttributeNames: {
            '#nm': 'Name',
        },
    };

    try {
        const data = await docClient.query(params).promise();
        return data.Count > 0;
    } catch (error) {
        console.error('Error checking name:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { mobileNumber, password, name } = JSON.parse(event.body);
    
    if (!mobileNumber || !password || !name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    // Ensure mobileNumber is a valid format (basic validation)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid mobile number format" }),
        };
    }

    try {
        // Check if the mobile number already exists
        const mobileExists = await checkMobileNumberExists(mobileNumber);
        if (mobileExists) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Mobile number already registered" }),
            };
        }

        // Check if the name already exists
        const nameExists = await checkNameExists(name);
        if (nameExists) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Name already registered" }),
            };
        }

        const userId = crypto.randomUUID();
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        const params = {
            TableName: process.env.USERS_TABLE,
            Item: {
                UserId: userId,
                MobileNumber: mobileNumber,
                PasswordHash: passwordHash,
                Name: name,
            },
        };

        await docClient.put(params).promise();
        return {
            statusCode: 201,
            body: JSON.stringify({ userId }),
        };
    } catch (error) {
        console.error('Error adding user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
