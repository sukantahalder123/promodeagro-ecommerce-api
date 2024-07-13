const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
    const { startTime, endTime, maxOrders } = JSON.parse(event.body);

    if (!startTime || !endTime || !maxOrders) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    const slotId = crypto.randomUUID();
    const params = {
        TableName: 'DeliveryTimeSlots',
        Item: {
            slotId: slotId,
            startTime: startTime,
            endTime: endTime,
            maxOrders: maxOrders,
            currentOrders: 0,
            available: true,
        },
    };

    try {
        await docClient.put(params).promise();
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Delivery slot created successfully", slotId }),
        };
    } catch (error) {
        console.error('Error creating delivery slot:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
