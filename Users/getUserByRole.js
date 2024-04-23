const AWS = require('aws-sdk');

exports.getUserByRole = async (event) => {
    const AWS = require('aws-sdk');

    // Set the region
    AWS.config.update({ region: 'us-east-1' });

    // Create a new instance of the Cognito Identity Provider
    const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

    const getUsersByGroup = async (groupName) => {
        const params = {
            GroupName: groupName,
            UserPoolId: 'us-east-1_WixNIljDH'
        };

        try {
            const data = await cognitoIdentityServiceProvider.listUsersInGroup(params).promise();
            return data.Users;
        } catch (error) {
            console.error('Error fetching users from Cognito:', error);
            throw new Error('Error fetching users from Cognito');
        }
    };

    const groupName = 'user'; // Specify the group name

    try {
        const users = await getUsersByGroup(groupName);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(users)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Error fetching users from Cognito.', error })
        };
    }
};
