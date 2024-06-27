# API Endpoint: Create Customer

This endpoint is used to create a new customer record.

## Method

- **Method**: POST

## URL

- **URL**: `https://khs9kwylpc.execute-api.us-east-1.amazonaws.com/customer`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "name": "string",
  "phone": "string"
}
```

## name: The name of the customer. Required. phone: The phone number of the customer. Required.


## API Endpoint: Get All Products

### Method
- **Method**: GET

### URL
- **URL**: `https://khs9kwylpc.execute-api.us-east-1.amazonaws.com/product`

---

## API Endpoint: Create Order

### Method
- **Method**: POST

### URL
- **URL**: `https://khs9kwylpc.execute-api.us-east-1.amazonaws.com/order`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
  "totalPrice": "string",
  "address": "string",
  "status": "string",
  "paymentMethod": "string",
  "paymentDetails": "string",
  "id": "string",
  "items": [
    {
      "productId": "string",
      "quantity": "string"
    },
    {
      "productId": "string",
      "quantity": "string"
    }
  ],
  "customerId": "string"
}
```