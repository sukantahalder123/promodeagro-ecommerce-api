const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
    const { startTime, endTime, maxOrders, year, month } = JSON.parse(event.body);

    if (!startTime || !endTime || !maxOrders || !year || !month) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const slots = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        slots.push(createSlot(date, startTime, endTime, maxOrders));
    }

    try {
        await Promise.all(slots);
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "Delivery slots created successfully for the month" }),
        };
    } catch (error) {
        console.error('Error creating delivery slots:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};

const createSlot = async (date, startTime, endTime, maxOrders) => {
    const slotId = crypto.randomUUID();
    const params = {
        TableName: 'DeliveryTimeSlots',
        Item: {
            slotId: slotId,
            date: date,
            startTime: startTime,
            endTime: endTime,
            maxOrders: maxOrders,
            currentOrders: 0,
            available: true,
        },
    };

    return docClient.put(params).promise();
};
