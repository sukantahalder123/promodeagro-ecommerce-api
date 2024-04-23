const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

module.exports.getByUserName = async (event) => {
  try {
    // Pass the username as a variable
    const username = '069301b7-ec4d-4383-a512-777e53c31ae7';

    const params = {
      UserPoolId: 'us-east-1_WixNIljDH', // Replace with your actual User Pool ID
      Username: username
    };

    const data = await cognito.adminGetUser(params).promise();
    const userAttributes = data.UserAttributes.reduce((acc, attribute) => {
      acc[attribute.Name] = attribute.Value;
      return acc;
    }, {});

    return {
      statusCode: 200,
      body: JSON.stringify({ userAttributes }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    console.error('Error: ', err);
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
