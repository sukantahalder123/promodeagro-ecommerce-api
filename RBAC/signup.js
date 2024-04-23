// const AWS = require('aws-sdk');
 
// const cognito = new AWS.CognitoIdentityServiceProvider();
// require('dotenv').config();
 
// exports.handler = async (event) => {
//     const { email, password } = JSON.parse(event.body);
//     console.log(email)
//     const username = email; // Set the email as the username
   
//     try {
//         // Create the user in Cognito
//         const userParams = {
//             UserPoolId: process.env.COGNITO_USER_POOL_ID,
//             Username: email,
//             UserAttributes: [
//                 {
//                     Name: 'email',
//                     Value: email
//                 }
//             ]
//         };
     
//         const createUserResponse = await cognito.adminCreateUser(userParams).promise();
//         if (createUserResponse.User) {
//             const paramsForSetPass = {
//                 Password: password,
//                 UserPoolId: process.env.COGNITO_USER_POOL_ID,
//                 Username: email,
//                 Permanent: true
//             };
 
//             await cognito.adminSetUserPassword(paramsForSetPass).promise();
//         }
//         //Assign role to the user
//         // const groupParams = {
//         //     GroupName: role, // Assuming role is a group name in Cognito
//         //     UserPoolId: process.env.COGNITO_USER_POOL_ID,
//         //     Username: username
//         // };
//         // await cognito.adminAddUserToGroup(groupParams).promise();
 
//         return {
//             statusCode: 200,
//             body: JSON.stringify({ message: 'User registered successfully'})
//         };
//     } catch (error) {
//         console.error('Error registering user:', error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ message: 'Error registering user', error: error })
//         };
//     }
// };


const AWS = require('aws-sdk');

const cognito = new AWS.CognitoIdentityServiceProvider();
require('dotenv').config();

exports.handler = async (event) => {
    const { email, password, groupname } = JSON.parse(event.body);
    const username = email; // Set the email as the username

    try {
        // Check if the group exists
        const listGroupsParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID
        };
        const existingGroups = await cognito.listGroups(listGroupsParams).promise();
        const groupExists = existingGroups.Groups.find(group => group.GroupName === groupname);

        // If the group doesn't exist, create it
        if (!groupExists) {
            const createGroupParams = {
                GroupName: groupname,
                UserPoolId: process.env.COGNITO_USER_POOL_ID
            };
            await cognito.createGroup(createGroupParams).promise();
        }

        // Create the user in Cognito
        const userParams = {
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: email,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: email
                }
            ]
        };

        const createUserResponse = await cognito.adminCreateUser(userParams).promise();
        if (createUserResponse.User) {
            const paramsForSetPass = {
                Password: password,
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: email,
                Permanent: true
            };

            await cognito.adminSetUserPassword(paramsForSetPass).promise();
        }

        // Assign user to the group
        const groupParams = {
            GroupName: groupname,
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: username
        };
        await cognito.adminAddUserToGroup(groupParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User registered successfully' })
        };
    } catch (error) {
        console.error('Error registering user:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error registering user', error: error })
        };
    }
};
