exports.handler = async (event) => {
    const { sessionToken } = event;
  
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'sessionToken-index', // Add a secondary index for querying by sessionToken
      KeyConditionExpression: 'sessionToken = :token',
      ExpressionAttributeValues: {
        ':token': sessionToken,
      },
    };
  
    try {
      const result = await dynamoDB.query(params).promise();
  
      if (result.Items.length === 0) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: 'Invalid session' }),
        };
      }
  
      const session = result.Items[0];
  
      if (Date.now() > session.expiresAt) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: 'Session expired' }),
        };
      }
  
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Session valid', userId: session.userId }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error validating session', error }),
      };
    }
  };
  