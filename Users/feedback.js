const AWS = require('aws-sdk');
const uuid = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { typeOfEnquiry, name, email, contact, feedback } = JSON.parse(event.body);

    // Generate a unique ID for the feedback entry
    const id = uuid.v4();

    // Prepare the DynamoDB item
    const params = {
        TableName: 'prod-promodeagro-admin-feedBackTable',
        Item: {
            id: id,
            typeOfEnquiry: typeOfEnquiry,
            name: name,
            email: email,
            contact: contact,
            feedback: feedback,
            timestamp: new Date().toISOString(),
        },
    };

    try {
        // Save the feedback to DynamoDB
        await dynamoDb.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Feedback stored successfully', id: id }),
        };
    } catch (error) {
        console.error('Error storing feedback:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error storing feedback', error: error.message }),
        };
    }
};
