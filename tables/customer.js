const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' }); // Replace 'your-region' with your AWS region

// Create a DynamoDB service object
const dynamoDB = new AWS.DynamoDB();

// Define parameters for creating the table
const params = {
    TableName: 'Customers', // Specify the table name
    KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' } // Define the primary key with 'id' as the hash key
    ],
    AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' } // Define the attributes and their types
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5, // Adjust the read capacity units based on your workload
        WriteCapacityUnits: 5 // Adjust the write capacity units based on your workload
    }
};

// Create the DynamoDB table
dynamoDB.createTable(params, (err, data) => {
    if (err) {
        console.error('Unable to create table. Error JSON:', JSON.stringify(err, null, 2));
    } else {
        console.log('Created table. Table description JSON:', JSON.stringify(data, null, 2));
    }
});
