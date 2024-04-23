module.exports.greetAdmin = async (event) => {
  // Assuming you have the user's role in the event context
  const userRole = event.requestContext.authorizer.claims['cognito:groups'];

  if (userRole && userRole.includes('ADMIN')) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Hello, Admin! This API is for admins.',
      }),
    };
  } else {
    return {
      statusCode: 403,
      body: JSON.stringify({
        message: 'Access denied. Only admins can access this API.',
      }),
    };
  }
};