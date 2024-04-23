const axios = require('axios');
module.exports.sendCatalogMessage = async (toNumber, whatsappToken) => {
    try {
        const myHeaders = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + whatsappToken
        };
 
        const sendCatalog = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": toNumber,
            "type": "interactive",
            "interactive": {
              "type": "catalog_message",
              "body": {
                "text": "Hi,"+ toNumber+ " Welcome to Promode Agro  quick shopping expirience."+
                "To start shopping, you can view our catalog and add items to purchase." 
              },
              "action": {
                "name": "catalog_message",
                "parameters": {
                  "thumbnail_product_retailer_id": "860320533328    "
                }
              },
              "footer": {
                "text": "Best grocery deals on WhatsApp!"
              }
            }
          };
 
        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            data: JSON.stringify(sendCatalog), // Convert to JSON string
            redirect: 'follow',
        };
 
        const response = await axios.post("https://graph.facebook.com/v19.0/208582795666783/messages", JSON.stringify(sendCatalog), requestOptions);
        const result = response.data;
        console.log(result);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
};
 
 
 
 
 
module.exports.sendPaymentLinkButton = async (toNumber, whatsappToken,url) => {
    try {
        const myHeaders = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + whatsappToken
        };
 
        const sendPaymentLinkButtonData = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": toNumber,
            "type": "interactive",
            "interactive": {
                "type": "cta_url",
                "body": {
                    "text": "Tap the button below to complete order payment."
                },
                "action": {
                    "name": "cta_url",
                    "parameters": {
                        "display_text": "Pay with UPI",
                        "url": url
                    }
                }
            }
        };
 
        const requestOptions = {
            headers: myHeaders,
        };
 
        const response = await axios.post("https://graph.facebook.com/v19.0/208582795666783/messages", sendPaymentLinkButtonData, requestOptions);
        const result = response.data;
        console.log(result);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
};