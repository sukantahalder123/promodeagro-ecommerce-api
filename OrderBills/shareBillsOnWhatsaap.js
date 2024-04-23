const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const { sendDocumentMessage } = require('./sendpdf');
exports.handler = async (event) => {
    try {
        // Get the file content or data you want to upload
        const { content, name, phoneNumber } = JSON.parse(event.body); // Assuming the content is JSON encoded
        console.log("PhoneNumber")
        console.log(phoneNumber)

        // Decode the base64 encoded content if needed
        const decodedContent = Buffer.from(content, 'base64');

        // Upload the PDF file to S3 in the "documents" folder
        const params = {
            Bucket: 'posdmsservice',
            Key: 'documents/' + name + '.pdf', // Specify the folder name and file name
            Body: decodedContent, // Use the decoded content
            ContentType: 'application/pdf'
        };

        // Upload the file to S3
        const uploadResult = await s3.upload(params).promise();
        const publicUrl = uploadResult.Location;

        await sendDocumentMessage(phoneNumber, publicUrl, name)

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

