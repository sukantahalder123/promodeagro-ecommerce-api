const AWS = require('aws-sdk');
const crypto = require('crypto');
require('dotenv').config();

const cognito = new AWS.CognitoIdentityServiceProvider();

const sendResponse = (statusCode, body) => {
    return {
        statusCode: statusCode,
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json'
        }
    };
};

module.exports.signUp = async (event) => {
    try {
        const { mobileNumber } = JSON.parse(event.body);
       
        const groupName =  'normal_user';

        const username=`user_${crypto.randomBytes(4).toString('hex')}`
        // Check if the user already exists
        const getUserParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Filter: `phone_number="${mobileNumber}"`
        };
      
        const listGroupsParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID
        };
        const existingGroups = await cognito.listGroups(listGroupsParams).promise();
         const groupExists = existingGroups.Groups.find(group => group.GroupName === groupName);
        
        // If the group doesn't exist, create it
        if (!groupExists) {
            const createGroupParams = {
                GroupName: groupName,
                UserPoolId: process.env.COGNITO_USER_POOL_ID
            };
            await cognito.createGroup(createGroupParams).promise();
        }

        const existingUsers = await cognito.listUsers(getUserParams).promise();
        if (existingUsers.Users.length > 0) {
            return sendResponse(400, { message: 'User already exists' });
        }
        
        // Create the user in Cognito
        const userParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username,
            UserAttributes: [
                {
                    Name: 'phone_number',
                    Value: mobileNumber
                },
                {
                    Name: 'phone_number_verified',
                    Value: 'true'
                }
            ],
            MessageAction: 'SUPPRESS'
        };
        const createUserResponse = await cognito.adminCreateUser(userParams).promise();
        console.log('User created:', createUserResponse);

        // Add the user to the group
        const addUserToGroupParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username,
            GroupName: groupName
        };
        await cognito.adminAddUserToGroup(addUserToGroupParams).promise();
        console.log('User added to group:', groupName);

        return sendResponse(200, { message: 'Registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        return sendResponse(500, { message: 'Error registering user', error: error });
    }
};
