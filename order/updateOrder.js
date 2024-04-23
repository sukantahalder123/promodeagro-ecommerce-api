const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

// Create DynamoDB client with options to remove undefined values
const dynamoDB = new DynamoDBClient({
    removeUndefinedValues: true
});

const orderTableName = process.env.ORDER_TABLE_NAME;
const customerTableName = process.env.CUSTOMER_TABLE_NAME;
const productTableName = process.env.PRODUCT_TABLE_NAME;

// Generate a random 5-digit number
function generateRandomOrderId() {
    return Math.floor(10000 + Math.random() * 90000);
}

// Handler function to create or update an order
module.exports.handler = async (event) => {
    try {
        const orderId = event.pathParameters.id; // Extract orderId from path parameters

        if (!orderId) {
            throw new Error('orderId is required');
        }

        const { items, paymentMethod, status, customerId, totalPrice } = JSON.parse(event.body);

        // Fetch existing order
        const getOrderParams = {
            TableName: orderTableName,
            Key: marshall({ id: orderId })
        };
        const { Item: existingOrderItem } = await dynamoDB.send(new GetItemCommand(getOrderParams));
        if (!existingOrderItem) {
            throw new Error(`Order with ID ${orderId} not found`);
        }
        const existingOrder = unmarshall(existingOrderItem);

        // Validate input
        if (!Array.isArray(items) || items.length === 0 || !customerId || !totalPrice) {
            throw new Error('Invalid input. "items" must be a non-empty array, "customerId" and "totalPrice" are required.');
        }

        // Fetch customer details
        const getCustomerParams = {
            TableName: customerTableName,
            Key: marshall({ id: customerId })
        };
        const { Item: customerItem } = await dynamoDB.send(new GetItemCommand(getCustomerParams));
        if (!customerItem) {
            throw new Error('Customer not found');
        }

        // Fetch product details for each item
        const products = [];
        for (const item of items) {
            const getProductParams = {
                TableName: productTableName,
                Key: marshall({ id: item.productId })
            };
            const { Item: productItem } = await dynamoDB.send(new GetItemCommand(getProductParams));
            if (!productItem) {
                throw new Error(`Product with ID ${item.productId} not found`);
            }
            products.push(unmarshall(productItem));
        }

        // Prepare updated order item
        const updatedOrderItem = {
            ...existingOrder,
            items: items.map(item => ({
                quantity: item.quantity
            })),
            paymentMethod: paymentMethod || existingOrder.paymentMethod,
            status: status || existingOrder.status,
            totalPrice: totalPrice.toString(),
            customerId: customerId,
            products: products,
            updatedAt: new Date().toISOString()
        };

        // Update order item in DynamoDB using UpdateItemCommand
        const updateParams = {
            TableName: orderTableName,
            Key: marshall({ id: orderId }),
            UpdateExpression: 'SET #items = :items, paymentMethod = :paymentMethod, #status = :status, totalPrice = :totalPrice, customerId = :customerId, products = :products, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#items': 'items',
                '#status': 'status'
            },
            ExpressionAttributeValues: marshall({
                ':items': updatedOrderItem.items,
                ':paymentMethod': updatedOrderItem.paymentMethod,
                ':status': updatedOrderItem.status,
                ':totalPrice': updatedOrderItem.totalPrice,
                ':customerId': updatedOrderItem.customerId,
                ':products': updatedOrderItem.products,
                ':updatedAt': updatedOrderItem.updatedAt
            })
        };

        await dynamoDB.send(new UpdateItemCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order updated successfully', orderId: orderId }),
        };
    } catch (error) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to process request', error: error.message }),
        };
    }
};
