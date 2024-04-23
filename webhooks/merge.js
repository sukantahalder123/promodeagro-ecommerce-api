const axios = require('axios');

async function sendButtons( whatsappToken, options) {
    try {
        
        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + whatsappToken
            },
             data: options,
             redirect: 'follow',
        };

        const response = await axios.post("https://graph.facebook.com/v19.0/208582795666783/messages", options, requestOptions);
        const result = response.data;

         console.log("Buttons message sent successfully. Response:", result);

        return response.data;
    } catch (error) {
        console.error("Error sending buttons message:", error);

        // Throw the error to handle it in the calling function
        throw error;
    }
}
module.exports = {
    sendButtons
};