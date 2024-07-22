const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
    const day = event.queryStringParameters.day;
    let date;

    if (!day) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required day query parameter" }),
        };
    }

    if (day === 'today') {
        date = new Date().toISOString().split('T')[0];
    } else if (day === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        date = tomorrow.toISOString().split('T')[0];
    } else {
        date = day; // Assume 'day' is already in the 'YYYY-MM-DD' format
    }

    const params = {
        TableName: 'DeliveryTimeSlots',
        FilterExpression: '#date = :date AND available = :available AND currentOrders < maxOrders',
        ExpressionAttributeNames: {
            '#date': 'date',
        },
        ExpressionAttributeValues: {
            ':date': date,
            ':available': true,
        },
    };

    try {
        const data = await docClient.scan(params).promise();
        const slots = data.Items.map(slot => {
            const slotDate = new Date(slot.date);
            const dayOfWeek = slotDate.toLocaleDateString('en-US', { weekday: 'long' });

            return {
                startTime: slot.startTime,
                endTime: slot.endTime,
                date: slot.date,
                available: slot.available,
                slotId: slot.slotId,
                dayOfWeek: dayOfWeek,
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(slots),
        };
    } catch (error) {
        console.error('Error listing delivery slots:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
