const { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const SALES_TABLE_NAME = "sales";
const ORDERS_TABLE_NAME = "Orders";
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE;
const dynamoDB = new DynamoDBClient({});

exports.handler = async (event) => {
    try {
        console.log(event)
        const { orderId } = event.body;

        if (!orderId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "orderId is required" }),
            };
        }

        // Fetch order details from the Orders table
        const getOrderParams = {
            TableName: ORDERS_TABLE_NAME,
            Key: marshall({ id: orderId })
        };

        const orderResponse = await dynamoDB.send(new GetItemCommand(getOrderParams));

        if (!orderResponse.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Order not found" }),
            };
        }

        const orderDetails = unmarshall(orderResponse.Item);
        const { items } = orderDetails;

        if (!items || items.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "No order items found" }),
            };
        }

        // Loop through each product in the order and record the sale
        for (const item of items) {
            const { productId, quantity, price, savings, quantityUnits } = item;

            if (!productId || !quantity) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "productId and Quantity are required in order items" }),
                };
            }

            // Check if the sale record already exists for the given orderId and productId using the GSI
            const querySaleParams = {
                TableName: SALES_TABLE_NAME,
                // IndexName: "OrderIdProductIdIndex",
                KeyConditionExpression: "orderId = :orderId AND productId = :productId",
                ExpressionAttributeValues: marshall({
                    ":orderId": orderId,
                    ":productId": productId
                })
            };

            const saleResponse = await dynamoDB.send(new QueryCommand(querySaleParams));

            if (saleResponse.Items && saleResponse.Items.length > 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: `Sale record already exists for orderId: ${orderId} and productId: ${productId}` }),
                };
            }

            // Fetch product details to get the category and subcategory
            const getProductParams = {
                TableName: PRODUCTS_TABLE_NAME,
                Key: marshall({ id: productId })
            };

            const productResponse = await dynamoDB.send(new GetItemCommand(getProductParams));

            if (!productResponse.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: `Product not found for productId: ${productId}` }),
                };
            }

            const productDetails = unmarshall(productResponse.Item);
            const { category, subCategory } = productDetails;

            console.log(`Product Details for ${productId}:`, productDetails); // Debug log

            const saleId = uuidv4();
            const saleTimestamp = new Date().toISOString();

            // Remove undefined values from the item to be marshalled
            const saleItem = {
                saleId: saleId,
                productId: productId,
                Quantity: quantity,
                QuantityUnits: quantityUnits,
                Price: price,
                Savings: savings,
                SaleTimestamp: saleTimestamp,
                orderId: orderId,
                Category: category,
                Subcategory: subCategory
            };

            console.log(`Sale Item to be marshalled:`, saleItem); // Debug log

            // Remove undefined values
            Object.keys(saleItem).forEach(key => saleItem[key] === undefined && delete saleItem[key]);

            const params = {
                TableName: SALES_TABLE_NAME,
                Item: marshall(saleItem)
            };

            await dynamoDB.send(new PutItemCommand(params));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Sales recorded successfully" }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "An error occurred while recording the sales" }),
        };
    }
};
