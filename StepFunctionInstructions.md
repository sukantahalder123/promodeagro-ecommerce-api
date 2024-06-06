# Creating a Step Function with Inventory Integration

For creating an order, we need to create three Step Functions: `OrderProcess`, `OrderUpdate`, and `ReturnRefund`. When an order is created, an API call is made through API Gateway, which triggers a Lambda function. This Lambda function executes two Step Functions: `OrderProcess` and `OrderStatus`. Once the order is created, we use the `OrderUpdate` Step Function for updating the order status. If a user requests a return and refund, we execute the `ReturnRefund` Step Function. All execution ARNs are stored in the database.

---

## Step 1: Define Lambda Functions

### a. Create Order Lambda Function

1. **Create a Lambda function** named `CreateOrderFunction`.
2. **Include logic** to:
   - Validate input.
   - Generate a random order ID.
   - Fetch customer details from the `Customer` table.
   - Fetch product details for each item from the `Product` table.
   - Prepare and save the order item in the `Order` table.

### b. Update Inventory Lambda Function

1. **Create a Lambda function** named `UpdateInventoryFunction`.
2. **Include logic** to:
   - Update the inventory for each product based on the order items.
   - Decrease the product quantity in the `Product` table.

---

## Step 2: Create and Configure Step Function

### a. Define the State Machine

1. **Create a JSON definition** for the Step Function with states:
   - `CreateOrder`: Invokes the `CreateOrderFunction` Lambda.
   - `UpdateInventory`: Invokes the `UpdateInventoryFunction` Lambda.
   - `OrderCompleted`: Marks the workflow as completed.

---

# Updating Step Function Execution based on Order Status Changes

This guide outlines the steps to update a Step Function's execution based on changes in order status stored in a database by Lambda functions.

---

## 1. Read Order Status from Database

Before updating the Step Function, retrieve the current status of the order from the database. This can be done within your Lambda functions.

## 2. Determine Next State

Once you have the current status, determine the next state of the Step Function based on the status received from the database.

## 3. Update Step Function Execution

Use the AWS SDK to update the Step Function execution with the new state. This should be done within your Lambda functions.

### Example Lambda Function (Node.js)

```javascript
const { SFNClient, SendTaskSuccessCommand } = require('@aws-sdk/client-sfn');

const sfn = new SFNClient({ region: 'REGION' });

async function updateStepFunctionExecution(executionArn, nextState) {
  const params = {
    taskToken: executionArn,
    output: JSON.stringify({ nextState })
  };

  await sfn.send(new SendTaskSuccessCommand(params));
}
```

## 1. REturn and Refund State Machine

1. **Define States**: Create states for each step in the return and refund process, such as `InitiateReturn`, `ProcessReturn`, `InitiateRefund`, `ProcessRefund`, and `RefundCompleted`.
   
2. **Transitions**: Define transitions between states based on the outcome of each step.

