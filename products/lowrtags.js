const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: "ap-south-1" });

const TABLE_NAME = "prod-promodeagro-admin-productsTable";

async function lowercaseTags() {
  try {
    let lastEvaluatedKey = null;
    do {
      // Scan to fetch items
      const scanParams = {
        TableName: TABLE_NAME,
        ProjectionExpression: "id, tags", // Adjust ProjectionExpression to match your schema
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const scanResult = await client.send(new ScanCommand(scanParams));
      lastEvaluatedKey = scanResult.LastEvaluatedKey;

      // Iterate over each item
      for (const item of scanResult.Items) {
        const data = unmarshall(item);

        if (data.tags && Array.isArray(data.tags)) {
          // Convert tags to lowercase
          const updatedTags = data.tags.map((tag) => tag.toLowerCase());

          // Update the item with new tags
          const updateParams = {
            TableName: TABLE_NAME,
            Key: {
              id: { S: data.id }, // Correct key structure for DynamoDB
            },
            UpdateExpression: "SET tags = :updatedTags",
            ExpressionAttributeValues: {
              ":updatedTags": { L: updatedTags.map((tag) => ({ S: tag })) }, // Correct format for DynamoDB list
            },
          };

          await client.send(new UpdateItemCommand(updateParams));
          console.log(`Updated tags for item with id: ${data.id}`);
        }
      }
    } while (lastEvaluatedKey);
    console.log("All tags updated successfully.");
  } catch (error) {
    console.error("Error updating tags:", error);
  }
}

lowercaseTags();
