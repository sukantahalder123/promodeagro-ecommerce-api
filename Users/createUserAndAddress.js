const AWS = require('aws-sdk');
const crypto = require('crypto');
const docClient = new AWS.DynamoDB.DocumentClient();
require('dotenv').config();

// Function to create a new user
async function createUser(userId, userDetails) {
    const params = {
        TableName: process.env.USERS_TABLE,
        Item: {
            UserId: userId,
            ...userDetails,
            defaultAddressId: null, // Initially, no default address
        },
    };

    try {
        await docClient.put(params).promise();
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Function to create an address
async function createAddress(userId, address) {
    const addressId = crypto.randomUUID(); // Generate a unique address ID
    const addressParams = {
        TableName: process.env.ADDRESS_TABLE,
        Item: {
            userId: userId,
            addressId: addressId,
            ...address,
        },
    };

    try {
        await docClient.put(addressParams).promise();
        return addressId;
    } catch (error) {
        console.error('Error creating address:', error);
        throw error;
    }
}

// Function to update user's default address
async function setDefaultAddress(userId, addressId) {
    const updateParams = {
        TableName: process.env.USERS_TABLE,
        Key: {
            UserId: userId,
        },
        UpdateExpression: 'set defaultAddressId = :addressId',
        ExpressionAttributeValues: {
            ':addressId': addressId,
        },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        await docClient.update(updateParams).promise();
    } catch (error) {
        console.error('Error setting default address:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    const { name, email, phoneNumber, flat, block, apartment, area, zipCode } = JSON.parse(event.body);

    // Validate input
    if (!name || !email || !phoneNumber || !flat || !block || !apartment || !area || !zipCode) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" }),
        };
    }

    try {
        // Auto-generate userId
        const userId = crypto.randomUUID();

        // Prepare user details for new user creation
        const userDetails = {
            name :name,
            email: email,
            MobileNumber :phoneNumber,
        };

        // Create the new user with generated userId
        await createUser(userId, userDetails);

        console.log("userCreated")

        // Create the new address for the user
        const addressId = await createAddress(userId, {
            phoneNumber,
            name,
            email,
            flat,
            block,
            apartment,
            area,
            zipCode,
        });

        console.log("userCreated")


        // Set the newly created address as the default address
        await setDefaultAddress(userId, addressId);

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'User and address created successfully',
                userId: userId,
                addressId: addressId,
            }),
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal Server Error",
                error: error.message,
            }),
        };
    }
};
