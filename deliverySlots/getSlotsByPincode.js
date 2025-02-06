// // handler.js

// const AWS = require('aws-sdk');
// const dynamoDb = new AWS.DynamoDB.DocumentClient();
// require('dotenv').config();

// module.exports.handler = async (event) => {
//     const { pincode } = event.pathParameters;

//     const params = {
//         TableName: process.env.DELIVERY_SLOT_TABLE,
//         KeyConditionExpression: 'pincode = :pincode',
//         FilterExpression: 'active = :active',

//         ExpressionAttributeValues: {
//             ':pincode': pincode,
//             ':active': true,

//         },
//     };

//     try {
//         const result = await dynamoDb.query(params).promise();
//         console.log(result)
//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 message: 'Delivery slots fetched successfully',
//                 slots: result.Items,
//             }),
//         };
//     } catch (error) {
//         console.error(error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({
//                 message: 'Failed to fetch delivery slots',
//                 error: error.message,
//             }),
//         };
//     }
// };
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

module.exports.handler = async (event) => {
    const { pincode } = event.pathParameters;

    const params = {
        TableName: process.env.DELIVERY_SLOT_TABLE,
        KeyConditionExpression: 'pincode = :pincode',
        FilterExpression: 'active = :active',
        ExpressionAttributeValues: {
            ':pincode': pincode,
            ':active': true,
        },
    };

    try {
        const result = await dynamoDb.query(params).promise();

        // Convert UTC time to IST (UTC+5:30)
        const nowUTC = new Date();
        const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);

        const currentHours = nowIST.getHours();
        const currentMinutes = nowIST.getMinutes();
        const currentTimeInMinutes = currentHours * 60 + currentMinutes;

        const convertToMinutes = (time, period) => {
            const [hours, minutes] = time.split(':').map(Number);
            const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : (period === 'AM' && hours === 12 ? 0 : hours);
            return adjustedHours * 60 + minutes;
        };

        const filteredSlots = result.Items.map((item) => {
            if (item.deliveryType === 'same day') {
                const filteredShifts = item.shifts.map((shift) => {
                    const validSlots = shift.slots.filter((slot) => {
                        const slotEndInMinutes = convertToMinutes(slot.end, slot.endAmPm);
                        return slotEndInMinutes > currentTimeInMinutes; // Keep only future slots for today
                    });
                    return { ...shift, slots: validSlots }; // Return the shift with filtered slots
                }).filter((shift) => shift.slots.length > 0); // Remove shifts without valid slots

                return { ...item, shifts: filteredShifts };
            } else if (item.deliveryType === 'next day') {
                // Keep all slots as next day slots are not time-sensitive for today
                return item;
            } else {
                // Remove items with invalid or unsupported deliveryType
                return null;
            }
        }).filter((item) => item && item.shifts.length > 0); // Remove items with no valid shifts or null items

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Delivery slots fetched successfully',
                slots: filteredSlots,
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to fetch delivery slots',
                error: error.message,
            }),
        };
    }
};
