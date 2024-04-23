const AWS = require('aws-sdk');
const { sendResponse } = require("./send");
const crypto = require('crypto');
require('dotenv').config();

const cognito = new AWS.CognitoIdentityServiceProvider();
const sns = new AWS.SNS(); // Initialize Amazon SNS

// Function to generate OTP
const generateOTP = () => {
    // Generate a 6-digit random OTP
    return Math.floor(100000 + Math.random() * 900000);
};

// Exporting the handler function as the default export
module.exports.handler = async (event) => {
    try {
        const { mobileNumber } = JSON.parse(event.body);
        const otp = generateOTP(); // Generate OTP as a number
        console.log(otp);

        // Create the user in Cognito with a dummy username and mobile number as an attribute
        const userParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: `user_${crypto.randomBytes(4).toString('hex')}`, // Dummy username
            UserAttributes: [
                {
                    Name: 'phone_number',
                    Value: mobileNumber
                },
                {
                    Name: 'custom:otp',
                    Value: otp.toString() // Save OTP as a string to match attribute type
                }
            ],
            MessageAction: "SUPPRESS"
        };

        // Use Cognito's built-in functionality to handle the username
        const createUserResponse = await cognito.adminCreateUser(userParams).promise();

        // Send OTP to the user's mobile number via SMS using Amazon SNS
        const snsParams = {
            Message: `Your OTP is: ${otp}`,
            PhoneNumber: mobileNumber,
        };
        await sns.publish(snsParams).promise();

        // Return success response
        return sendResponse(200, { message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        return sendResponse(500, { message: 'Error registering user', error: error });
    }
};
