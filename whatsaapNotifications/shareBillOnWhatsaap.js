const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const { sendDocumentMessage } = require('./sendPdf');
 async function shareBillOnWhatsaap(content, name, phoneNumber) {
    try {
        // Get the file content or data you want to upload
        console.log("PhoneNumber")
        console.log(phoneNumber)

        // Decode the base64 encoded content if needed
        const decodedContent = Buffer.from(content, 'base64');

        // Upload the PDF file to S3 in the "documents" folder
        const params = {
            Bucket: 'ecomdmsservice',
            Key: 'bills/' + name + '.pdf', // Specify the folder name and file name
            Body: decodedContent, // Use the decoded content
            ContentType: 'application/pdf'
        };

        // Upload the file to S3
        const uploadResult = await s3.upload(params).promise();
        const publicUrl = uploadResult.Location;
        console.log(publicUrl)

     const dd =   await sendDocumentMessage(phoneNumber, publicUrl, name)
     console.log(dd)

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'File uploaded successfully',
                publicUrl: publicUrl
            })
        };
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to process request');
    }
};

module.exports = { shareBillOnWhatsaap };
