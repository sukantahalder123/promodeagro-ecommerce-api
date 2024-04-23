const axios = require('axios');
const {client} = require('./db')

require('dotenv').config();

async function sendAddressMessageWithSavedAddresses(toNumber, whatsappToken, userDetails) {
    try {
        let messageData;

        // If userDetails is not empty, construct the message with saved address details
        if (userDetails && Object.keys(userDetails).length > 0) {
            messageData = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: toNumber,
                type: "interactive",
                interactive: {
                    type: "address_message",
                    body: {
                        text: "Thanks for your order! Tell us what address you’d like this order delivered to."
                    },
                    action: {
                        name: "address_message",
                        parameters: {
                            country: "IN",
                            saved_addresses: [
                                {
                                    id: "address1",
                                    value: {
                                        name: userDetails.values.name,
                                        phone_number: userDetails.values.phone_number,
                                        in_pin_code: userDetails.values.in_pin_code,
                                        floor_number: userDetails.values.floor_number,
                                        building_name: userDetails.values.building_name,
                                        address: userDetails.values.address,
                                        landmark_area: userDetails.values.landmark_area,
                                        city: userDetails.values.city
                                    }
                                }
                            ]
                        }
                    }
                }
            };
        } else {
            // If userDetails is empty, prompt the user to provide their delivery address
           
         messageData = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": toNumber,
            "type": "interactive",
            "interactive": {
                "type": "address_message",
                "body": {
                    "text": "Thanks for your order! Tell us what address you’d like this order delivered to."
                },
                "action": {
                    "name": "address_message",
                    "parameters": {
                        "country": "IN"
                    }
                }
            }
        };

        }

        // Set up headers for the HTTP request
        const myHeaders = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + whatsappToken
        };

        // Set up request options
        const requestOptions = {

            headers: myHeaders,
            redirect: 'follow',
        };

        console.log("Sending address message with saved addresses to number:", toNumber);

        // Send the address message with saved addresses

        const response = await axios.post("https://graph.facebook.com/v19.0/208582795666783/messages", messageData, requestOptions);
        const result = response.data;

        console.log("Address message with saved addresses sent successfully:", result);

        return result;
    } catch (error) {
        console.error('Error sending address message with saved addresses:', error);
        throw error;
    }
}

async function getUserAddressFromDatabase(senderId) {
    try {
        const params = {
            TableName: 'users', // Specify the table name
            Key: { 'phone_number': senderId } // Define the primary key
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item) {
            return null; // User not found in the database
        }

        return result.Item.details; // Extract user details from the database item
    } catch (error) {
        console.error('Error fetching user address details from DynamoDB:', error);
        throw error;
    }
}

// Function to store user response in DynamoDB
async function storeUserResponse(phone_number_id, message) {
    try {
        const params = {
            TableName: 'users', // Specify the table name
            Item: {
                'phone_number': phone_number_id, // Specify the primary key
                'details': message // Store user details
            }
        };

        await dynamodb.put(params).promise(); // Store user response in DynamoDB

    } catch (error) {
        console.error('Error storing user response in DynamoDB:', error);
        throw error;
    }
}
module.exports = {
    sendAddressMessageWithSavedAddresses,
    getUserAddressFromDatabase,
    storeUserResponse
};