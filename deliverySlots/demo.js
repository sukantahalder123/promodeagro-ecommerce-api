// Import the necessary AWS SDK modules
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');

// Create a new DynamoDB client
const client = new DynamoDBClient({
});

// Define the parameters for the Scan operation
const params = {
  TableName: 'prod-promodeagro-admin-pincodeTable',  // Replace with your table name
};

async function fetchPincodes() {
  let lastEvaluatedKey = null;
  const pincodes = [];

  do {
    const scanParams = {
      TableName: 'prod-promodeagro-admin-pincodeTable',  // Replace with your table name
      ExclusiveStartKey: lastEvaluatedKey,  // Start from the last evaluated key if there is one
    };

    try {
      // Execute the ScanCommand with pagination
      const data = await client.send(new ScanCommand(scanParams));
      
      if (data.Items) {
        // Extract only the 'Pincode' attribute from each item
        data.Items.forEach(item => {
          if (item.pincode) {
            pincodes.push(item.pincode.S);  // Assuming Pincode is a String attribute
          }
        });
      }

    //   lastEvaluatedKey = data.LastEvaluatedKey;  // Update the key for the next batch

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  } while (lastEvaluatedKey);  // Continue scanning if there's more data

  console.log('Fetched pincodes:', pincodes);
}

// Call the function to fetch the list of pincodes
fetchPincodes();
