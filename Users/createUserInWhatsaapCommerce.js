const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid'); // Import UUID for generating unique IDs
const docClient = new AWS.DynamoDB.DocumentClient();
require("dotenv").config();

exports.handler = async (event) => {
    const { mobileNumber } = JSON.parse(event.body);

    // Check for missing fields
    if (!mobileNumber) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Missing required fields",
                statusCode: 401,
            }),
        };
    }

    // Ensure mobileNumber is a valid format (basic validation)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Invalid mobile number format",
                statusCode: 401,
            }),
        };
    }

    // Define DynamoDB query parameters
    const queryParams = {
        TableName: process.env.USERS_TABLE,
        IndexName: "MobileNumber-index", // Specify the index name here
        KeyConditionExpression: "MobileNumber = :mobileNumber",
        ExpressionAttributeValues: {
            ":mobileNumber": mobileNumber,
        },
    };

    try {
        // Query DynamoDB to check if the user exists
        const data = await docClient.query(queryParams).promise();
        const user = data.Items[0];

        if (user) {
            // If user exists, return a message
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "User already exists",
                    statusCode: 200,
                }),
            };
        } else {
            // If user does not exist, insert the new user
            const newUserParams = {
                TableName: process.env.USERS_TABLE,
                Item: {
                    UserId: uuidv4(), // Generate a unique UserId
                    MobileNumber: mobileNumber,
                    // Include other user details here as necessary
                },
            };

            // Insert the new user into DynamoDB
            await docClient.put(newUserParams).promise();

            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "User created successfully",
                    statusCode: 201,
                }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message,
            }),
        };
    }
};
