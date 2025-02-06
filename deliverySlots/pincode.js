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

        // Get current IST time
        const nowUTC = new Date();
        const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);

        // Extract the current time in minutes
        const hoursIST = nowIST.getUTCHours().toString().padStart(2, '0');
        const minutesIST = nowIST.getUTCMinutes().toString().padStart(2, '0');
        const currentTime = `${hoursIST}:${minutesIST}`;

        console.log(currentTime)

        console.log(`Current Time (IST): ${nowIST.toISOString()}`);
        console.log(`Current Time in Minutes: ${currentTime}`);

        const convertToMinutes = (time) => {
            let [hours, minutes] = time.split(':').map(Number);
           
            return hours * 60 + minutes;
        };

        function convertTo24Hour(hours, minutes, period) {
            if (period.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
        
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        
        const filteredSlots = result.Items.map((item) => {
            let sameDaySlots = [];
            let nextDaySlots = [];

            if (item.deliveryTypes.includes('same day')) {
                const sameDayShifts = item.shifts.map((shift) => {
                    const validSlots = shift.slots.filter((slot) => {
                        let [hours, minutes] = slot.start.split(':').map(Number);
                        console.log(hours,minutes)
                        const format24 = convertTo24Hour(hours,minutes,slot.startAmPm)
                        console.log("format to 24 "+ format24)
                        const slotStartInMinutes = convertToMinutes(format24, slot.startAmPm);
                        const currentTimeInMinutes = convertToMinutes(currentTime);
                        console.log(slotStartInMinutes)
                        console.log(currentTimeInMinutes)
                        return slotStartInMinutes > currentTimeInMinutes;
                    }).map((slot) => ({
                        ...slot,
                        deliveryDay: 'same day',
                    }));

                    return { ...shift, slots: validSlots };
                }).filter((shift) => shift.slots.length > 0);

                if (sameDayShifts.length > 0) {
                    sameDaySlots = sameDayShifts;
                }
            }

            if (item.deliveryTypes.includes('next day')) {
                const nextDayShifts = item.shifts.map((shift) => ({
                    ...shift,
                    slots: shift.slots.map((slot) => ({
                        ...slot,
                        deliveryDay: 'next day',
                    })),
                }));
                nextDaySlots = nextDayShifts;
            }

            return {
                sameDaySlots,
                nextDaySlots,
            };
        });

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
