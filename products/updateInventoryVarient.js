const AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-1' });  // Set your AWS region

const { DynamoDB } = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = new DynamoDB.DocumentClient();

// Function to update variant_id for all inventory items with unitPrices
async function updateVariantIdsForAllRecords() {
  try {
    // Scan the inventory table
    const params = {
      TableName: 'dev-promodeagro-admin-inventoryTable',
    };

    let items;
    do {
      const result = await dynamoDb.scan(params).promise();
      items = result.Items;

      // Process each item
      for (const item of items) {
        if (item.unitPrices && item.unitPrices.length > 0) {
          let updated = false;

          // Update unitPrices if needed
          const updatedUnitPrices = item.unitPrices.map((unitPrice) => {
            if (!unitPrice.varient_id) {
              updated = true;
              return {
                ...unitPrice,
                varient_id: uuidv4(), // Add new varient_id if missing
              };
            }
            return unitPrice;
          });

          console.log(updatedUnitPrices)

          // If unitPrices were updated, save the changes back to DynamoDB
          if (updated) {
            await dynamoDb
              .update({
                TableName: 'dev-promodeagro-admin-inventoryTable',
                Key: { id: item.id }, // Use 'id' as the primary key
                UpdateExpression: "set unitPrices = :unitPrices",
                ExpressionAttributeValues: {
                  ":unitPrices": updatedUnitPrices,
                },
              })
              .promise();

            console.log(`Updated inventory item ${item.id} with new variant IDs.`);
          }
        }
      }

      // If there are more items, continue scanning
      params.ExclusiveStartKey = result.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey !== "undefined");

    console.log("Update completed for all applicable inventory items.");
  } catch (error) {
    console.error("Error updating variant IDs in inventory:", error);
  }
}

// Run the function to update all records
updateVariantIdsForAllRecords();
