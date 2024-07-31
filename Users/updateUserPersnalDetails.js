'use strict';

const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = new AWS.DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    const { userId, name, email, contact } = JSON.parse(event.body);

    if (!userId || !name || !email || !contact) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required fields' }),
        };
    }

    // Check if the user exists
    const getParams = {
        TableName: process.env.USERS_TABLE,
        Key: {
            UserId: userId
        }
    };

    try {
        const { Item } = await docClient.send(new GetCommand(getParams));

        if (!Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'User not found' }),
            };
        }

        // Update user details within the persnalDetails field
        const updateParams = {
            TableName: process.env.USERS_TABLE,
            Key: {
                UserId: userId
            },
            UpdateExpression: 'SET persnalDetails = :persnalDetails',
            ExpressionAttributeValues: {
                ':persnalDetails': {
                    name: name,
                    email: email,
                    contact: contact
                }
            },
            ReturnValues: 'UPDATED_NEW'
        };

        await docClient.send(new UpdateCommand(updateParams));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User details updated successfully' }),
        };
    } catch (error) {
        console.error('Error updating user details:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update user details' }),
        };
    }
};
