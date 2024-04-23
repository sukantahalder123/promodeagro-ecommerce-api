const AWS = require('aws-sdk');

AWS.config.update({
    region: '', // Any valid AWS region (DynamoDB Local ignores the region)
    endpoint: 'http://localhost:8000' // Endpoint URL for DynamoDB Local
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Function to get the incomplete order alert flag from DynamoDB
async function getIncompleteOrderAlertSent(senderId) {
    try {
        const params = {
            TableName: 'sessions', // Specify the table name
            Key: { 'sender_id': senderId }, // Define the primary key
            ProjectionExpression: 'session_data.incompleteOrderAlertSent' // Projection expression to only retrieve the flag
        };

        const result = await dynamodb.get(params).promise();

        if (result.Item && result.Item.session_data && result.Item.session_data.incompleteOrderAlertSent) {
            return result.Item.session_data.incompleteOrderAlertSent === 'true'; // Convert flag to boolean
        } else {
            return false; // If no item found or incompleteOrderAlertSent is undefined, return false
        }
    } catch (error) {
        console.error('Error retrieving incomplete order alert flag:', error);
        throw error;
    }
}


// Function to update the incomplete order alert flag in DynamoDB
async function setIncompleteOrderAlertSent(senderId, value) {
    try {
        const params = {
            TableName: 'sessions', // Specify the table name
            Key: { 'sender_id': senderId }, // Define the primary key
            UpdateExpression: 'SET session_data.incompleteOrderAlertSent = :val', // Update expression
            ExpressionAttributeValues: { ':val': value }, // Attribute values
            ReturnValues: 'UPDATED_NEW' // Specify what to return after the update
        };

        await dynamodb.update(params).promise(); // Update item in DynamoDB
    } catch (error) {
        console.error('Error updating incomplete order alert flag:', error);
        throw error;
    }
}

async function getPreviousIncompleteOrder(senderId) {
    try {
        const params = {
            TableName: 'sessions', // Specify the table name
            Key: { 'sender_id': senderId }, // Define the primary key
            ProjectionExpression: 'session_data.incompleteOrderAlertSent, session_data.cart' // Projection expression to only retrieve the flag and cart
        };

        const result = await dynamodb.get(params).promise();

        if (result.Item && result.Item.session_data && 'incompleteOrderAlertSent' in result.Item.session_data) {
            const flag = result.Item.session_data.incompleteOrderAlertSent === 'true'; // Convert flag to boolean
            const cart = result.Item.session_data.cart?.items || []; // Extract cart items or initialize with empty array
            return { flag, cart };
        } else {
            return { flag: false, cart: [] }; // No previous incomplete order alert found
        }
    } catch (error) {
        console.error('Error retrieving incomplete order alert flag and cart:', error);
        throw error;
    }
}


// Function to fetch the previous order cart from DynamoDB
async function fetchPreviousOrderFromDatabase(senderId) {
    try {
        const params = {
            TableName: 'sessions', // Specify the table name
            Key: { 'sender_id': senderId }, // Define the primary key
            ProjectionExpression: 'session_data.cart' // Projection expression to only retrieve the cart
        };

        const result = await dynamodb.get(params).promise();

        if (result.Item && result.Item.session_data.cart) {
            return result.Item.session_data.cart.items;
        } else {
            return null; // No previous order cart found
        }
    } catch (error) {
        console.error('Error fetching previous order from database:', error);
        throw error;
    }
}

module.exports = {
    getIncompleteOrderAlertSent,
    setIncompleteOrderAlertSent,
    getPreviousIncompleteOrder,
    fetchPreviousOrderFromDatabase
}