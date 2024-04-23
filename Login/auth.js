// Dynamic authorizer function
exports.authorizer = async (event) => {
  try {
    // console.log(event);

    // Extract the JWT token from the Authorization header
   
    const token = event.headers.Authorization.split(' ')[1];
     //console.log(token)
    // Decode the JWT token to get the Cognito user claims
    const decodedToken = decode(token);
    console.log("@@@"+ decodedToken)
    // Check if the required claims are present
    if (decodedToken && decodedToken['cognito:groups']) {
      const groups = decodedToken['cognito:groups'];
      console.log(groups)

      // Define a mapping of groups to allowed resources
      const groupPermissions = {
        'user': ['/getOrder/{id}', '/getAllOrder'],
        'admin': ['/order'
      ],
        // Add more groups and their allowed resources as needed
      };
      console.log(event.resource)
      // Check if user is in any allowed group
      for (const group in groupPermissions) {
        if (groups.includes(group)) {
          const allowedResources = groupPermissions[group];
            console.log(allowedResources)
          if (allowedResources.includes(event.resource)) {
            return generatePolicy(group, 'Allow', event.methodArn);
          }
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
  // console.log(principalId)
  // console.log(effect)
  // console.log(resource)
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