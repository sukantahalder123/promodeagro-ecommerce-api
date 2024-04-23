
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const axios = require('axios');


exports.handler = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event, null, 2));

        const orderTableName = process.env.ORDER_TABLE_NAME;
        const customerTableName = process.env.CUSTOMER_TABLE_NAME;
        const productTableName = process.env.PRODUCT_TABLE_NAME;


        switch (event.fieldName) {
            case 'createOrder':
                const { input } = event.arguments;
                const { items, paymentMethod, status, customerId, totalPrice } = input;
                console.log(input)

                const orderId = generateRandomOrderId().toString();

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
                const productS = [];
                for (const item of items) {
                    const getProductParams = {
                        TableName: productTableName,
                        Key: marshall({ id: item.productId })
                    };
                    const { Item: productItem } = await dynamoDB.send(new GetItemCommand(getProductParams));
                    if (!productItem) {
                        throw new Error(`Product with ID ${item.productId} not found`);
                    }
                    productS.push(unmarshall(productItem));
                }

                // Prepare order item
                const orderItem = {
                    id: orderId,
                    createdAt: new Date().toISOString(),
                    items: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    })),
                    paymentMethod: paymentMethod,
                    status: status.toUpperCase() || "PENDING",
                    totalPrice: totalPrice.toString(),
                    customerId: customerId,
                    updatedAt: new Date().toISOString(),
                    _lastChangedAt: Date.now().toString(),
                    _version: '1',
                    __typename: 'Order'
                };

                // Save order item to DynamoDB using PutItemCommand
                const putParamsOrder = {
                    TableName: orderTableName,
                    Item: marshall(orderItem)
                };

                await dynamoDB.send(new PutItemCommand(putParamsOrder));



                return orderItem;

            case 'listOrders':
                const params = {
                    TableName: tableName,
                };

                const result = await dynamoDB.scan(params).promise();
                const product = result.Items;
                return {
                    items: product,
                };

            case 'syncOrders':
                const param = {
                    TableName: tableName,
                };

                const results = await dynamoDB.scan(param).promise();
                const products = results.Items;
                return {
                    items: products,
                };


            case 'getOrder':
                const { id } = event.arguments; // Extract 'id' from input
                const getParams = {
                    TableName: tableName,
                    Key: {
                        id: id,
                    },
                };

                const getResult = await dynamoDB.get(getParams).promise();
                console.log(getResult)
                const getProduct = getResult.Item;
                return getProduct

            case 'updateOrder':
                const { updateInput } = event.arguments;
                const { updateImage } = input;
                const updateFbData = {

                }

                // Check if ID is provided
                if (!updateInput.id) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: 'Missing required field: id' }),
                    };
                }


                // Prepare update expression and attribute values for DynamoDB update
                let updateExpression = 'SET ';
                const expressionAttributeValues = {};
                const expressionAttributeNames = {};


                // Update the price field if provided
                if (updateInput.price) {
                    updateExpression += '#price = :price, ';
                    expressionAttributeNames['#price'] = 'price';
                    expressionAttributeValues[':price'] = updateInput.price;
                    updateFbData.price = updateInput.price
                }

                // Update other fields if provided
                if (updateInput.name) {
                    updateExpression += '#name = :name, ';
                    expressionAttributeNames['#name'] = 'name';
                    expressionAttributeValues[':name'] = updateInput.name;
                    updateFbData.name = updateInput.name;
                }

                if (updateInput.image) {
                    // Upload image to S3
                    const s3params = {
                        Bucket: 'posdmsservice',
                        Key: updateInput.name + updateInput.category, // Adjust this as per your requirement
                        Body: Buffer.from(updateInput.image, 'base64'),
                        ContentType: 'image/png'
                    };
                    const uploadResult = await s3.upload(s3params).promise();
                    const publicUrl = uploadResult.Location;

                    updateExpression += '#image = :image, ';
                    expressionAttributeNames['#image'] = 'image';
                    expressionAttributeValues[':image'] = publicUrl;
                    updateFbData.image_url = publicUrl;
                }

                if (updateInput.description) {
                    updateExpression += '#description = :description, ';
                    expressionAttributeNames['#description'] = 'description';
                    expressionAttributeValues[':description'] = updateInput.description;
                    updateFbData.description = updateInput.description;
                }
                if (updateInput.unit) {
                    updateExpression += '#unit = :unit, ';
                    expressionAttributeNames['#unit'] = 'unit';
                    expressionAttributeValues[':unit'] = updateInput.unit.toUpperCase();
                }
                if (updateInput.category) {
                    updateExpression += '#category = :category, ';
                    expressionAttributeNames['#category'] = 'category';
                    expressionAttributeValues[':category'] = updateInput.category.toUpperCase();
                    updateFbData.category = updateInput.category.toUpperCase();
                }

                // Remove the trailing comma and space from the update expression
                updateExpression = updateExpression.slice(0, -2);
                expressionAttributeValues[':updatedAt'] = new Date().toISOString();
                expressionAttributeNames['#updatedAt'] = 'updatedAt';
                updateExpression += ', #updatedAt = :updatedAt';

                // Update the product in DynamoDB
                const updateParams = {
                    TableName: tableName,
                    Key: { id: updateInput.id },
                    UpdateExpression: updateExpression,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                };


                console.log("dataaaa", updateFbData)
                const updateproduct = {
                    access_token: ACCESS_TOKEN,
                    requests: [
                        {
                            method: 'UPDATE',
                            retailer_id: updateInput.id,
                            data: updateFbData
                        }
                    ]
                };

                console.log('Sending update request to Facebook Graph API:', updateproduct.requests[0].data);

                // Make a request to Facebook Graph API
                await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`, updateproduct);



                const updatedProduct = await dynamoDB.update(updateParams).promise();

                return updatedProduct;


            default:
                throw new Error(`Unknown field, unable to resolve ${event.info.fieldName}`);
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to process request');
    }
};
