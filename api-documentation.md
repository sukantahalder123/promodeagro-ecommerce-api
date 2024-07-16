
# E-commerce API DOCUMENTATION


## API Endpoint: RegisterUser

This endpoint is used to register user.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/register`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "name": "string",
  "mobileNumber": "string",
  "password":"string"
}
```

### name: The name of the user. Required. 
### mobileNumber: The phone number of the user. Required.
### password: The password of the user. Requires.



## API Endpoint: Login user

This endpoint is used to login user.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/login`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "mobileNumber": "string",
  "password":"string"
}
```

### mobileNumber: The phone number of the user. Required.
### password: The password of the user. Requires.


## API Endpoint: Change User Password

This endpoint is used to change user password.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/changePassword`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "mobileNumber":"string", 
    "oldPassword":"string", 
    "newPassword":"string"
}
```

### mobileNumber: The phone number of the user. Required.
### oldPassword: The oldPassword of the user. Requires.
### newPassword: The newPassword of the user. Requires.





## API Endpoint: addItemsCart

This endpoint is used to add products Items in cart.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/addItem`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "string",
    "productId": "string",
    "quantity": 'int',
    "quantityUnits": 'int'
}

```

## API Endpoint: Update Cart Item

Updates the quantity of an item in the user's cart .

## Method

- **Method**: PUT

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/updateItem`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "string",
    "productId": "string",
    "quantity": 'int',
    "quantityUnits": 'int'
}

```

## API Endpoint: Delete Cart Item

Deletes an item from the user's cart.

## Method

- **Method**: DELETE

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/deleteItem`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "userId": "string",
  "productId": "string",
}

```


## API Endpoint: Get Cart Item

Retrieves all items in the user's cart.

## Method

- **Method**: GET

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/getItems/{userId}`  



## API Endpoint: Add User Address

add user Address .

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/addAddress`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "string",
    "address": {
       address details
    }
}

```


## API Endpoint: update User Address

update user Address .

## Method

- **Method**: PUT

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/updateAddress`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "string",
    "addressId": "string",
    "address": {
       address details
    }
}

```



## API Endpoint: Get User Address

Get user Address .

## Method

- **Method**: GET

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getAllAddress/{userId}`  



## API Endpoint: Delete User Address

Delete user Address .

## Method

- **Method**: DELETE

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/deleteAddress`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "string",
    "addressId": "string",
  
}

```



## API Endpoint: Set Default Address

Set default Address .

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/setDefaultAddress`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "string",
    "addressId": "string",
  
}

```


## API Endpoint: Get Default Address

Get default Address .

## Method

- **Method**: GET

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getDefaultAddress/{userId}`  



## API Endpoint: Get All Products

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/product`

---


## API Endpoint: Get Product by productId

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/product/{productId}?userId={userId}`

  it return cartItems of user if its added in the cart 

## API Endpoint: Product Filters

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/products`

## Query Parameters (Optional)
### minPrice: Filter by minimum price.
### maxPrice: Filter by maximum price.
### discounts: Filter by discount ranges. Provide values like upto5, 10to15, 15to25, morethan25.
### Example Request:  GET https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/products?minPrice=5&maxPrice=15&discounts=upto5,10to15
This request retrieves details of the product with  prices between 5 and 15, and discounts ranging from up to 5% ,to 10% to 15%,15% to 25,morethan25.

---
## API Endpoint: Global Searh

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/products/search?query={name}`

---


## API Endpoint: Get Products By category

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getProductByCategory?category={category}`

---

## API Endpoint: Get Products By SubCategory

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getProductBySubCategory?subcategory={subcategory}`

---




## API Endpoint: Get All Categories

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/category`

---







## API Endpoint: Create Order

### Method
- **Method**: POST

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/order`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
  "items": [
    {
      "productId": "string",
      "quantity": 2,
      "quantityUnits": 500
    },
    {
      "productId": "string",
      "quantity": 1,
      "quantityUnits": 1000
    }
  ],
  "userId": "string",
  "addressId": "string",
  "paymentDetails": {
    "paymentMethod": "string",
    "totalAmount": 120.50,
    "transactionId": "string",
    "paymentStatus": "string"
  },
  "deliverySlotId": "string"
}

```


## API Endpoint: Get All Orders of user

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/order/{userId}`



## API Endpoint: Get Order by orderId

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/order/{orderId}`



## API Endpoint: Get Available Delivery Slots

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getAvailableDeliverySlots`
