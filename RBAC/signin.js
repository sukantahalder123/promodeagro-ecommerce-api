
const AWS = require('aws-sdk');
const { sendResponse, validateInput } = require("./send");
const crypto = require('crypto');
require('dotenv').config();
 
const cognito = new AWS.CognitoIdentityServiceProvider();
 
const calculateSecretHash = (username, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET) => {
    const data = username + COGNITO_CLIENT_ID;
    return crypto
        .createHmac('sha256', COGNITO_CLIENT_SECRET)
        .update(data, 'utf8')
        .digest('base64');
};
 
module.exports.handler = async (event) => {
    try {
        const isValid = validateInput(event.body);
    
        if (!isValid)
            return sendResponse(400, { message: 'Invalid input' });
 
        const { email, password } = JSON.parse(event.body);
   
        const { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET } = process.env;
  
        // Calculate SECRET_HASH
        const secretHash = calculateSecretHash(email, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET);
   
        const params = {
            AuthFlow: "ADMIN_NO_SRP_AUTH", 
            UserPoolId: COGNITO_USER_POOL_ID,
            ClientId: COGNITO_CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
                SECRET_HASH: secretHash,
            }
        };
 
        const response = await cognito.adminInitiateAuth(params).promise();
 
       
 
        return sendResponse(200, { message: 'Success', token: response.AuthenticationResult.IdToken});
    } catch (error) {
        console.error('Error:', error);
        const message = error.message ? error.message : 'Internal server error';
        return sendResponse(500, { message });
    }
};