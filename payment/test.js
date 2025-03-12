// const axios = require('axios');
// const crypto = require('crypto');

// // Replace with actual values
// const merchantId = "M22W1CT0P467T";
// const saltKey = "665e5791-304d-4d70-82ee-93e1ff023b2c";
// const saltIndex = "1";
// const baseURL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";  // Change for production

// async function initiatePayment(transactionId, amount, callbackUrl) {
//     const payload = {
//         merchantId,
//         merchantTransactionId: transactionId,
//         merchantUserId: "MUID123",
//         amount: amount * 100, // Convert to paise
//         redirectUrl: "https://yourwebsite.com/payment-success",
//         redirectMode: "REDIRECT",
//         callbackUrl,
//         paymentInstrument: {
//             type: "PAY_PAGE"
//         }
//     };

//     // Convert payload to Base64
//     const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

//     // Generate X-Verify checksum
//     const dataToHash = base64Payload + "/pg/v1/pay" + saltKey;
//     const sha256Hash = crypto.createHash("sha256").update(dataToHash).digest("hex");
//     const xVerify = `${sha256Hash}###${saltIndex}`;

//     try {
//         const response = await axios.post(baseURL, { request: base64Payload }, {
//             headers: {
//                 "Content-Type": "application/json",
//                 "X-VERIFY": xVerify
//             }
//         });

//         console.log(response)
//         if (response.data.success) {
//             console.log("Payment URL:", response.data.data.instrumentResponse.redirectInfo.url);
//             return response.data.data.instrumentResponse.redirectInfo.url;
//         } else {
//             console.error("Payment initiation failed:", response);
//             return null;
//         }
//     } catch (error) {
//         console.error("Error initiating payment:", error);
//     }
// }

// // Example Usage
// initiatePayment("TXN123456", 100, "https://yourwebsite.com/callback");


const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require('pg-sdk-node');
const { randomUUID } = require('crypto');

 
const clientId = "SU2502211922471263703580";
const clientSecret = "665e5791-304d-4d70-82ee-93e1ff023b2c";
const clientVersion = 1;  //insert your client version here
const env = Env.PRODUCTION;      //change to Env.PRODUCTION when you go live

       //change to Env.PRODUCTION when you go live
 
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
 
const merchantOrderId = randomUUID();
const amount = 100;
const redirectUrl = "https://www.merchant.com/redirect";
// const metaInfo = MetaInfo.builder()
//                     .udf1("udf1")
//                     .udf2("udf2")
//                     .build();
 
const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantOrderId)
        .amount(amount)
        .redirectUrl(redirectUrl)
        // .metaInfo(metaInfo)
        .build();
 
client.pay(request).then((response)=> {
    const checkoutPageUrl = response.redirectUrl;
    console.log(checkoutPageUrl)
})