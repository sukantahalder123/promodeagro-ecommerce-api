const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1', 
    endpoint: 'http://localhost:8000' 
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.authorizer = async (event) => {
    try {
        // Extract the JWT token from Authorization.split(' ')[1];
        const token = event.headers.Authorization.split(' ')[1];
        // Decode the JWT token to get the Cognito user claims
        const decodedToken = decode(token);

        // Check if the required claims are present
        if (decodedToken && decodedToken['cognito:groups']) {
            const groups = decodedToken['cognito:groups'];

            // Get permissions from the database
            const permissions = await getPermissionsFromDatabase();
       


var method;
if(event.httpMethod=='POST'||event.httpMethod=='DELETE'||event.httpMethod=='UPDATE')
{
method='write'
}
else{
  method='read'
}


            // Check if user is in any allowed group and has permission for the requested resource
            for (const permission of permissions) {
             const pr=permission.permissions        
                if (groups.includes(permission.groupName) && pr.some(item => item.permission.includes(method) && item.endpoint === event.resource)) {
                    return generatePolicy(permission.groupName, 'Allow', event.methodArn);
                }
            }
        }

        // Return a default "Deny" policy if no matching group/resource is found
        return generatePolicy('default', 'Deny', event.methodArn);
    } catch (error) {
        console.error('Error in authorizer:', error);
        return generatePolicy('default', 'Deny', event.methodArn);
    }
};

const generatePolicy = (principalId, effect, resource) => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
    };
};

// Helper function to decode JWT token
const decode = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(decoded);
};

async function getPermissionsFromDatabase() {
    const params = {
        TableName: 'PermissionsTable' // Adjust table name as per your DynamoDB configuration
    };

    try {
        const data = await dynamoDB.scan(params).promise();
        const permissions = data.Items.map(item => ({
            groupName: item.groupname,
            permissions: item.permissions
        }));
        return permissions;
    } catch (error) {
        console.error('Error fetching permissions from the database:', error);
        throw error;
    }
}



