const AWS = require('aws-sdk');
const { sendResponse } = require("./send");
const crypto = require('crypto');
require('dotenv').config();

const cognito = new AWS.CognitoIdentityServiceProvider();

// Function to verify OTP
const verifyOTP = async (mobileNumber, otp) => {
    try {
        // Retrieve user attributes by searching for the user with the provided phone number
        const searchParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Filter: `phone_number = "${mobileNumber}"`,
            Limit: 1
        };
        const searchResult = await cognito.listUsers(searchParams).promise();
        const user = searchResult.Users[0];

        // Check if the phone number is verified
        const phoneVerified = user.UserAttributes.find(attr => attr.Name === 'phone_number_verified');
        if (!phoneVerified || phoneVerified.Value !== 'true') {
            throw new Error('Phone number is not verified');
        }

        // Check if user has the correct OTP
        const userOtpAttribute = user.Attributes.find(attr => attr.Name === 'custom:otp');
        if (!userOtpAttribute || userOtpAttribute.Value !== otp.toString()) {
            throw new Error('Invalid OTP');
        }

        // Return user data if OTP is valid
        return {
            username: user.Username,
            userId: user.Username // Use whatever user identifier you need
        };
    } catch (error) {
        throw new Error('Error verifying OTP: ' + error.message);
    }
};

// Exporting the handler function as the default export
module.exports.signIn = async (event) => {
    try {
        const { mobileNumber, otp } = JSON.parse(event.body);

        // Verify OTP
        const userData = await verifyOTP(mobileNumber, otp);

        // Return success response with user data
        return sendResponse(200, { message: 'OTP verified successfully', user: userData });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return sendResponse(500, { message: 'Error verifying OTP', error: error });
    }
};
