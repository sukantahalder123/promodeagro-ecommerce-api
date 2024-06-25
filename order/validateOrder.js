// const AWS = require('aws-sdk');
// AWS.config.update({ region: 'us-east-1' });
// const dynamoDB = new AWS.DynamoDB.DocumentClient();
// const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
// require('dotenv').config();

// const lambda = new LambdaClient();

// module.exports.handler = async (event) => {
//     const body = JSON.parse(event.body);
//     const { items, paymentMethod, status, customerId, paymentDetails } = body;

//     if (!Array.isArray(items) || items.length === 0 || !customerId || !paymentDetails) {
//         throw new Error('Invalid input. "items" must be a non-empty array, "customerId", and "paymentDetails" are required.');
//     }

//     const validationResults = [];
//     let totalPrice = 0;

//     try {
//         // Retrieve all inventory items
//         const inventoryParams = {
//             TableName: 'Inventory',
//         };
//         const inventoryData = await dynamoDB.scan(inventoryParams).promise();
//         console.log('Inventory Data:', inventoryData);

//         const inventory = {};
//         for (const item of inventoryData.Items) {
//             inventory[item.productId] = item.availableQuantity;
//         }
//         console.log('Inventory Object:', inventory);

//         // Validate items against inventory and fetch product details
//         for (const item of items) {
//             if (!inventory[item.productId]) {
//                 validationResults.push({
//                     productId: item.productId,
//                     status: 'failure',
//                     message: 'Product not found in inventory'
//                 });
//             } else if (inventory[item.productId] < item.quantity) {
//                 validationResults.push({
//                     productId: item.productId,
//                     status: 'failure',
//                     message: 'Insufficient quantity in inventory'
//                 });
//             } else {
//                 // Fetch product details
//                 const productParams = {
//                     TableName: 'Products',
//                     Key: {
//                         id: item.productId
//                     }
//                 };
//                 const productData = await dynamoDB.get(productParams).promise();

//                 if (!productData.Item) {
//                     validationResults.push({
//                         productId: item.productId,
//                         status: 'failure',
//                         message: 'Product details not found'
//                     });
//                 } else {
//                     const productPrice = productData.Item.price;
//                     console.log(productPrice)
//                     totalPrice += productPrice * item.quantity;
//                     validationResults.push({
//                         productId: item.productId,
//                         status: 'success',
//                         message: 'Product available',
//                         price: productPrice
//                     });
//                 }
//             }
//         }

//         const allValid = validationResults.every(result => result.status === 'success');

//         console.log(validationResults);

//         if (allValid) {
//             const orderEvent = {
//                 body: JSON.stringify({
//                     items: items,
//                     paymentMethod: paymentMethod,
//                     status: status || 'PENDING',
//                     customerId: customerId,
//                     totalPrice: totalPrice, // Use the calculated total price
//                     paymentDetails: paymentDetails
//                 })
//             };

//             const invokeParams = {
//                 FunctionName: 'arn:aws:lambda:us-east-1:851725323791:function:promodeAgro-ecommerce-api-prod-createOrder',
//                 Payload: JSON.stringify(orderEvent),
//             };

//             const invokeCommand = new InvokeCommand(invokeParams);
//             const response = await lambda.send(invokeCommand);

//             const orderResult = JSON.parse(new TextDecoder().decode(response.Payload));

//             return {
//                 statusCode: 200,
//                 body: { isValid: allValid, details: validationResults, orderResult: orderResult },
//             };
//         } else {
//             return {
//                 statusCode: 200,
//                 body: JSON.stringify({ isValid: allValid, details: validationResults }),
//             };
//         }
//     } catch (error) {
//         console.error(error);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({ message: error.message }),
//         };
//     }
// };

// // (async () => {
// //     const event = {
// //         body: JSON.stringify({
// //             items: [
// //                 { productId: "19545137084", quantity: 5 },
// //                 { productId: "1247017220352", quantity: 3 }
// //             ],
// //             paymentMethod: 'credit_card',
// //             status: 'pending',
// //             customerId: '61676',
// //             paymentDetails: {
// //                 status: 'PENDING',
// //                 date:"present Date"
// //             }
// //         })
// //     };

// //     try {
// //         const result = await validateOrder(event);
// //         console.log(result);
// //     } catch (error) {
// //         console.error('Error:', error);
// //     }
// // })();

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
require('dotenv').config();

const lambda = new LambdaClient();

module.exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const { items, paymentMethod, status, customerId, paymentDetails } = body;

    if (!Array.isArray(items) || items.length === 0 || !customerId || !paymentDetails) {
        throw new Error('Invalid input. "items" must be a non-empty array, "customerId", and "paymentDetails" are required.');
    }

    const validationResults = [];
    let totalPrice = 0;

    try {
        // Retrieve all inventory items
        const inventoryParams = {
            TableName: 'Inventory',
        };
        const inventoryData = await dynamoDB.scan(inventoryParams).promise();
        console.log('Inventory Data:', inventoryData);

        const inventory = {};
        for (const item of inventoryData.Items) {
            inventory[item.productId] = item.availableQuantity;
        }
        console.log('Inventory Object:', inventory);

        // Validate items against inventory and fetch product details
        for (const item of items) {
            if (!inventory[item.productId]) {
                validationResults.push({
                    productId: item.productId,
                    status: 'failure',
                    message: 'Product not found in inventory'
                });
            } else if (inventory[item.productId] < item.quantity) {
                validationResults.push({
                    productId: item.productId,
                    status: 'failure',
                    message: 'Insufficient quantity in inventory'
                });
            } else {
                // Fetch product details
                const productParams = {
                    TableName: 'Products',
                    Key: {
                        id: item.productId
                    }
                };
                const productData = await dynamoDB.get(productParams).promise();

                if (!productData.Item) {
                    validationResults.push({
                        productId: item.productId,
                        status: 'failure',
                        message: 'Product details not found'
                    });
                } else {
                    const productPrice = productData.Item.price;
                    console.log(productPrice)
                    totalPrice += productPrice * item.quantity;
                    validationResults.push({
                        productId: item.productId,
                        status: 'success',
                        message: 'Product available',
                        price: productPrice
                    });
                }
            }
        }

        const allValid = validationResults.every(result => result.status === 'success');

        console.log(validationResults);

        if (allValid) {
            const orderEvent = {
                body: JSON.stringify({
                    items: items,
                    paymentMethod: paymentMethod,
                    status: status || 'PENDING',
                    customerId: customerId,
                    totalPrice: totalPrice, // Use the calculated total price
                    paymentDetails: paymentDetails
                })
            };

            const invokeParams = {
                FunctionName: 'arn:aws:lambda:us-east-1:851725323791:function:promodeAgro-ecommerce-api-prod-createOrder',
                Payload: JSON.stringify(orderEvent),
            };

            const invokeCommand = new InvokeCommand(invokeParams);
            const response = await lambda.send(invokeCommand);

            const orderResult = JSON.parse(new TextDecoder().decode(response.Payload));

            return {
                statusCode: 200,
                body: {
                    isValid: allValid,
                    details: validationResults,
                    orderResult: orderResult
                },
            };
        } else {
            return {
                statusCode: 200,
                body: {
                    isValid: allValid,
                    details: validationResults
                },
            };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: {
                message: error.message
            },
        };
    }
};
