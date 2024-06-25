const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' }); // Replace with your desired region

const stepfunctions = new AWS.StepFunctions();

const stateMachineArn = 'arn:aws:states:us-east-1:851725323791:stateMachine:Ecommerce_Order_process';

module.exports.handler = async (event) => {
    try {

        const body = JSON.parse(event.body);
        const { items, paymentMethod, status, customerId, paymentDetails } = body; // Include paymentDetails here

        // Validate input
        if (!Array.isArray(items) || items.length === 0 || !customerId || !paymentDetails) { // Check for paymentDetails

            console.log(event)
            throw new Error('Invalid input. "items" must be a non-empty array, "customerId", "totalPrice", and "paymentDetails" are required.');
        }

        const input = {
            items: items,
            paymentMethod: paymentMethod,
            status: status,
            customerId: customerId,
            paymentDetails: paymentDetails
        };

        const params = {
            stateMachineArn: stateMachineArn,
            input: JSON.stringify({ body: JSON.stringify(input) }) // Wrap the input in the expected structure
        };

        console.log("Starting Step Functions execution with params:", params);

        const data = await stepfunctions.startExecution(params).promise();

        console.log("Started Step Functions execution with executionArn:", data.executionArn);

        return {
            statusCode: 200,
            body: JSON.stringify({ executionArn: data.executionArn }),
        };
    } catch (err) {
        console.error("Failed to start Step Functions execution:", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};

// (async () => {
    // const event = {
    //     body: JSON.stringify({
    //         items: [
    //             { productId: "19545137084", quantity: 5 },
    //             { productId: "1247017220352", quantity: 3 }
    //         ],
    //         paymentMethod: 'CASH',
    //         status: 'pending',
    //         customerId: '61676',
    //         paymentDetails: {
    //             status: 'PENDING',
    //             date: "present Date"
    //         }
    //     })
    // };

//     try {
//         const result = await executeMachine(event);
//         console.log(result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// })();
