const axios = require('axios');

async function sendOrderConfirmation(orderId, number, token) {
  try {

    let data = JSON.stringify({
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": number,
      "type": "text",
      "text": {
        "body": `*#ORDER ID ${orderId}*\nORDER CONFIRMED `
      }
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://graph.facebook.com/v19.0/208582795666783/messages',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: data
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(error);
    return { error: error.message };
  }
}


module.exports = {
  sendOrderConfirmation
};
