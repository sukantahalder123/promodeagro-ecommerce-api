const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { mobileNumber, password } = JSON.parse(event.body);

    if (!mobileNumber || !password) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    // Hash the provided password to match the stored PasswordHash in DynamoDB
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const params = {
        TableName: 'Users',
        IndexName: 'MobileNumber-index', // Specify the index name here
        KeyConditionExpression: 'MobileNumber = :mobileNumber',
        ExpressionAttributeValues: {
            ':mobileNumber': mobileNumber,
        },
    };

    try {
        const data = await docClient.query(params).promise();
        const user = data.Items[0];

        if (user && user.PasswordHash === passwordHash) {
            return {
                statusCode: 200,
                body: JSON.stringify({ userId: user.UserId, name: user.Name }),
            };
        } else {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Invalid mobile number or password" }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error }),
        };
    }
};
