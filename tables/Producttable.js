const AWS = require('aws-sdk');

// Set the region for AWS SDK
AWS.config.update({ region: 'us-east-1' }); // Change 'us-east-1' to your desired region

// Create a new DynamoDB service object
const dynamodb = new AWS.DynamoDB();

// Define the parameters for the DynamoDB table
const params = {
    TableName: 'Products', // Specify the table name
    KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }  // Define the primary key
    ],
    AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' } // Define the attributes and their types
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,  // Adjust read capacity units as needed
        WriteCapacityUnits: 5  // Adjust write capacity units as needed
    }
};

// Create the DynamoDB table
dynamodb.createTable(params, (err, data) => {
    if (err) {
        console.error('Error creating table:', JSON.stringify(err, null, 2));
    } else {
        console.log('Table created successfully:', JSON.stringify(data, null, 2));
    }
});
