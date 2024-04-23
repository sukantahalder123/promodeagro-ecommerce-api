const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1', 
    endpoint: 'http://localhost:8000' 
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.authorizer = async (event) => {
    try {
        // Extract the JWT token from the Authorization header
        const token = event.headers.Authorization.split(' ')[1];

        // Decode the JWT token to get the Cognito user claims
        const decodedToken = decode(token);
console.log("^^^^^^^^",decodedToken.groupName)
        // Check if the required claims are present
        if (decodedToken.groupName) {
            const groups = decodedToken.groupName;

            // Get permissions from the database
            const permissions = await getPermissionsFromDatabase();
            console.log("$*$*$*$*$*",permissions)
console.log("^^^",event.resource)
console.log("^^^",event.httpMethod)


var method;
if(event.httpMethod=='POST'||event.httpMethod=='DELETE'||event.httpMethod=='UPDATE')
{
method='write'
}
else{
  method='read'
}
console.log("PP}}}",method)

            // Check if user is in any allowed group and has permission for the requested resource
            for (const permission of permissions) {
              console.log("^^^4", permission.permissions)
              console.log("-----------",groups.includes(permission.groupName))
              const pr=permission.permissions
              const hasPermission = pr.some(item => item.permission.includes(method) && item.endpoint === event.resource);

             // const containsPermission = pr.some(item => item.permission === method && item.endpoint === event.resource);
console.log("&*&",hasPermission)

              //console.log("###", pr.some(item => item.permission === method && item.endpoint === event.resource))
                if (groups.includes(permission.groupName) && pr.some(item => item.permission.includes(method) && item.endpoint === event.resource)) {
                    console.log("#@@@!!!!!!!!!!!!")
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





