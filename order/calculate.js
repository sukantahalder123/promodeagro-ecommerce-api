const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const dynamoDBClient = new DynamoDBClient({ region: "ap-south-1" });
const TABLE_NAME = "prod-promodeagro-admin-OrdersTable";

const getTotalOrderAmount = async () => {
    let totalAmount = 0;
    let lastEvaluatedKey = undefined;

    try {
        do {
            const params = {
                TableName: TABLE_NAME,
                ProjectionExpression: "finalTotal",
                ExclusiveStartKey: lastEvaluatedKey,
            };

            const command = new ScanCommand(params);
            const response = await dynamoDBClient.send(command);
            
            response.Items.forEach(item => {
                const order = unmarshall(item);
                totalAmount += order.finalTotal || 0;
            });

            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return totalAmount;
    } catch (error) {
        console.error("Error scanning orders: ", error);
        throw new Error("Failed to get total order amount");
    }
};

(async () => {
    console.log(await getTotalOrderAmount());
})();
