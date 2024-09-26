

require('dotenv').config();
const whatsappToken = process.env.FACEBOOK_ACCESS_TOKEN;


async function sendDocumentMessage (phoneNumber, documentLink, documentName){
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + whatsappToken);
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Cookie", "ps_l=0; ps_n=0");

    const raw = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phoneNumber,
        "type": "template",
        "template": {
            "name": "sendpdf",
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "document",
                            "document": {
                                "link": documentLink,
                                "filename": documentName
                            }
                        }
                    ]
                }
            ]
        }
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    return fetch("https://graph.facebook.com/v18.0/208582795666783/messages", requestOptions)
        .then((response) => response.text())
        .then((result) => result)
        .catch((error) => error);
}


module.exports = { sendDocumentMessage };
