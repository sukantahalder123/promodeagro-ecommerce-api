const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

// Function to check if a mobile number already exists
async function checkMobileNumberExists(mobileNumber, userId) {
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'MobileNumber-index',
        KeyConditionExpression: 'MobileNumber = :mobileNumber',
        ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        if (data.Count > 0) {
            const user = data.Items[0];
            return user.UserId !== userId;
        }
        return false;
    } catch (error) {
        console.error('Error checking mobile number:', error);
        throw error;
    }
}

// Function to check if a name already exists
async function checkNameExists(name, userId) {
    const params = {
        TableName: process.env.USERS_TABLE,
        IndexName: 'Name-index',
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
        if (data.Count > 0) {
            const user = data.Items[0];
            return user.UserId !== userId;
        }
        return false;
    } catch (error) {
        console.error('Error checking name:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { userId, mobileNumber, name, email } = JSON.parse(event.body);

    if (!userId) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Missing required field: userId", statusCode: 401 }),
        };
    }

    // Validate mobile number format if provided
    const mobileRegex = /^[0-9]{10}$/;
    if (mobileNumber && !mobileRegex.test(mobileNumber)) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Invalid mobile number format", statusCode: 401 }),
        };
    }

    try {
        // Check if the mobile number already exists
        if (mobileNumber) {
            const mobileExists = await checkMobileNumberExists(mobileNumber, userId);
            if (mobileExists) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Mobile number already registered", statusCode: 401 }),
                };
            }
        }

        // Check if the name already exists
        if (name) {
            const nameExists = await checkNameExists(name, userId);
            if (nameExists) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Name already registered", statusCode: 401 }),
                };
            }
        }

        // Dynamically build the update expression
        let updateExpression = 'set';
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        if (mobileNumber) {
            updateExpression += ' MobileNumber = :mobileNumber,';
            expressionAttributeValues[':mobileNumber'] = mobileNumber;
        }
        if (name) {
            updateExpression += ' #nm = :name,';
            expressionAttributeValues[':name'] = name;
            expressionAttributeNames['#nm'] = 'Name';
        }
        if (email) {
            updateExpression += ' email = :email,';
            expressionAttributeValues[':email'] = email;
        }

        // Remove trailing comma from the update expression
        updateExpression = updateExpression.slice(0, -1);

        const params = {
            TableName: process.env.USERS_TABLE,
            Key: { UserId: userId },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'UPDATED_NEW',
        };

        // Add ExpressionAttributeNames only if it's not empty
        if (Object.keys(expressionAttributeNames).length > 0) {
            params.ExpressionAttributeNames = expressionAttributeNames;
        }

        await docClient.update(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "User details updated successfully", statusCode: 200 }),
        };
    } catch (error) {
        console.error('Error updating user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message, statusCode: 500 }),
        };
    }
};
