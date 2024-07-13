const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
    const params = {
        TableName: 'DeliveryTimeSlots',
        FilterExpression: 'available = :available AND currentOrders < maxOrders',
        ExpressionAttributeValues: {
            ':available': true,
        },
    };

    try {
        const data = await docClient.scan(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error) {
        console.error('Error listing delivery slots:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
