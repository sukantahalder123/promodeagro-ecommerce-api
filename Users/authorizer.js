const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

// Function to decode JWT token
const decode = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(decoded);
};

// Function to generate authorization policy
const generatePolicy = (principalId, effect, resource) => {
    const authResponse = {
        principalId: principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource,
            }],
        },
        context: {
            tenant: 'tenant1', // Example context (you can customize this)
        },
    };
    return authResponse;
};

exports.handler = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event));

        // Check if Authorization header exists
        if (!event.headers || !event.headers.authorization) {
            console.log('Authorization header is missing');
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Authorization header is missing' }),
            };
        }

        // Split token from Authorization header
        const token = event.headers.authorization.split(' ')[1].trim(); // Trim any extra whitespace

        console.log('Token:', token);

        let decodedToken;
        try {
            // Decode the JWT token to get the claims
            decodedToken = decode(token);
        } catch (err) {
            console.log('JWT Decoding Error:', err.message);
            // Return 401 Unauthorized if token decoding fails
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Invalid JWT token' }),
            };
        }

        console.log('Decoded Token:', decodedToken);

        // Check if token contains necessary information
        if (!decodedToken || !decodedToken.userId) {
            console.log('Missing user information in token');
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Missing user information in token' }),
            };
        }

        // Query DynamoDB to check if user exists
        const params = {
            TableName: 'Users',
            Key: {
                UserId: decodedToken.userId,
            },
        };

        const data = await docClient.get(params).promise();
        console.log('DynamoDB Response:', data);

        const user = data.Item;

        // Check if user exists in the database
        if (!user) {
            console.log('User not found in database');
            return {
                statusCode: 403, // Forbidden
                body: JSON.stringify({ message: 'User not authorized to access this resource' }),
            };
        }

        // User is authorized, generate an "Allow" policy
        const effect = 'Allow';
        const resource = event.routeArn; // Adjust this as per your event structure

        // Generate the authorization policy
        const authResponse = generatePolicy(decodedToken.userId, effect, resource);

        // Return the authorization response
        console.log('Authorization successful:', authResponse);
        return authResponse;

    } catch (error) {
        console.error('Authorization Error:', error);
        // Return 401 Unauthorized for known authorization issues
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }
};
