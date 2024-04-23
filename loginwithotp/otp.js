const AWS = require('aws-sdk');
const crypto = require('crypto');
require('dotenv').config();

const cognito = new AWS.CognitoIdentityServiceProvider();
const sns = new AWS.SNS();

const generateOTP = () => {
    // Generate a 6-digit random OTP
    return Math.floor(100000 + Math.random() * 900000);
};

const sendOTP = async (mobileNumber, otp) => {
    // Send OTP to user's mobile number via SMS using Amazon SNS
    const params = {
        Message: `Your OTP for login: ${otp}`,
        PhoneNumber: mobileNumber
    };
    await sns.publish(params).promise();
};

const associateOTPWithUser = async (mobileNumber, otp) => {
   
    const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: mobileNumber,
        UserAttributes: [
            {
                Name: 'custom:otp',
                Value: otp.toString()
            }
        ]
    };
    await cognito.adminUpdateUserAttributes(params).promise();
};

module.exports.generateAndSendOTP = async (event) => {
    try {
        const { mobileNumber } = JSON.parse(event.body);
        const otp = generateOTP();
       
      //  await sendOTP(mobileNumber, otp);
        await associateOTPWithUser(mobileNumber, otp);
        return { statusCode: 200, body: JSON.stringify({ message: 'OTP generated and sent successfully',otp:otp }) };
    } catch (error) {
        console.error('Error generating and sending OTP:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Error generating and sending OTP', error: error }) };
    }
};
