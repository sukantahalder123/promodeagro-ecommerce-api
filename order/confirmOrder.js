const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { sendOrderConfirmation } = require('./sendOrderConnformationMessage');
require('dotenv').config();
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });

module.exports.handler = async (event) => {
    const orderId = event.orderId;

    if (!orderId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'orderId is required' })
        };
    }

    try {
        // Update order status to 'Confirmed' in DynamoDB
        const params = {
            TableName: 'Orders',
            Key: { id: orderId },
            UpdateExpression: 'set #s = :status',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':status': 'CONFIRMED' },
            ReturnValues: 'ALL_NEW' // Return the updated item
        };

        const updatedOrder = await dynamoDB.update(params).promise();
        console.log('Updated Order:', updatedOrder.Attributes);

        const customerId = updatedOrder.Attributes.customerId;

        const param = {
            TableName: 'Customers',
            Key: { id: customerId }
        };

        var customer = await dynamoDB.get(param).promise();

        if (!customer.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Customer not found' })
            };
        }
        console.log('Customer:', customer.Item.phone);

        const token = process.env.FACEBOOK_ACCESS_TOKEN;

        await sendOrderConfirmation(orderId, customer.Item.phone, token);

        const sessionParams = {
            TableName: 'sessions',
            Key: {
                sender_id: customer.Item.phone // Ensure customer.Item.phone is defined
            },
            UpdateExpression: 'REMOVE cart',
            ReturnValues: 'UPDATED_NEW'
        };

        try {
            console.log('sessionParams:', sessionParams);

            // const command = new UpdateItemCommand(sessionParams);
            // console.log('command:', command);

            const sessionUpdateResult = await dynamoDB.update(sessionParams).promise();
            console.log('Session Update Result:', sessionUpdateResult);

            // Handle the result as needed
        } catch (error) {
            console.error('Error updating session:', error);
            // Handle error appropriately, such as logging or returning an error response
        }


        return {
            statusCode: 200,
            body: JSON.stringify(updatedOrder.Attributes)
        };
    } catch (error) {
        console.error('Error updating order status:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to update order status' })
        };
    }
};

// Example invocation (commented out for deployment):
// (async () => {
//     const event = {
//         orderId: "69283"
//     };

//     try {
//         const result = await module.exports.handler(event);
//         console.log(result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// })();
