
# E-commerce API DOCUMENTATION


<br>
<br>


# USER

## API Endpoint: Validate otp  RegisterUser

This endpoint is used to validate register user.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/login/validate-otp`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "mobileNumber": "string",
  "otp":"string"
}
```




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
}
```

### mobileNumber: The phone number of the user. Required.


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
    "userId":"string", 
    "oldPassword":"string", 
    "newPassword":"string"
}
```

### userId : The userId the user. Required.
### newPassword: The newPassword of the user. Requires.





## API Endpoint: Forget User Password

This endpoint is used to forget users password.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/forgetPassword`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "mobileNumber": "string",
  "newPassword":"string"
}
```

### mobileNumber: The phone number of the user. Required.
### newPassword: The Newpassword of the user. Requires.



## API Endpoint: update User information

This endpoint is used to update User information.

## Method

- **Method**: PUT

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/updatePersnalDetail`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId":"string",
    "mobileNumber":"string",
    "email":"string",
    "name":"name"
}
```
### userId: The userId of the user. required.
### mobileNumber: The phone number of the user. optional.
### name: The name of the user. optional.
### email: The email of the user. optional.


## API Endpoint: Get User Persnal details

Retrieves Persnal details of user.

## Method

- **Method**: GET

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getPersnalDetails?userId={userId}`  



<br>
<br>
<br>


# Cart
<br>


## API Endpoint: addListOFItems in Cart

This endpoint is used to add products Items in cart.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/addListOfItems`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "854f5788-4bb5-4714-b47f-67d9173b0c63",
    "cartItems": [
        {
            "productId": "800edc08-644e-4abd-97a5-d8095a431ce1",
            "quantity": 1,
            "quantityUnits":1
        },
        {
            "productId": "1df198ce-a25f-4bf3-83e6-942fdf09d3fc",
            "quantity": 1,
            "quantityUnits": 1
        },
        {
            "productId": "c96cfa0b-154b-449a-b0e8-cca5ca97a568",
            "quantity": 1,
            "quantityUnits": 250
        }
    ]
}

```

## API Endpoint: Update Cart Items

Updates the quantity of an item in the user's cart .

## Method

- **Method**: PUT

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/updateListOfItems`  

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json

     {
    "userId": "854f5788-4bb5-4714-b47f-67d9173b0c63",
    "cartItems": [
        {
            "productId": "800edc08-644e-4abd-97a5-d8095a431ce1",
            "quantity": 3,
            "quantityUnits":1
        },
        {
            "productId": "1df198ce-a25f-4bf3-83e6-942fdf09d3fc",
            "quantity": 2,
            "quantityUnits": 1
        },
        {
            "productId": "c96cfa0b-154b-449a-b0e8-cca5ca97a568",
            "quantity": 5,
            "quantityUnits": 250
        }
    ]
}
```


## API Endpoint: addItems in Cart

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
    "userId": "854f5788-4bb5-4714-b47f-67d9173b0c63",
    "productId": "800edc08-644e-4abd-97a5-d8095a431ce1",
    "quantity": 1,
    "quantityUnits":1
}

```



## API Endpoint:update Item in Cart

This endpoint is used to add products Items in cart.

## Method

- **Method**: POST

## URL

- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/cart/updateItem`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
    "userId": "854f5788-4bb5-4714-b47f-67d9173b0c63",
    "productId": "800edc08-644e-4abd-97a5-d8095a431ce1",
    "quantity": 1,
    "quantityUnits":1
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


<br>
<br>
<br>


# Address
<br>

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


<br>
<br>
<br>

# Products
<br>

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



## API Endpoint: Get HomePage Products


### Method
- **Method**: GET

### URL
- **URL**: `https://9ti4fcd117.execute-api.ap-south-1.amazonaws.com/homePageProducts}?userId={userId}`

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
### category: Filter Product by category
### subcategory: Filter product by subcategory
### ratingFilter: Filter by rating .Provide values like '5.0','4.0 & up','3.0 & up','2.0 & up'

### Example Request:  GET https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/products?minPrice=5&maxPrice=15&discounts=upto5,10to15
This request retrieves details of the product with  prices between 5 and 15, and discounts ranging from up to 5% ,to 10% to 15%,15% to 25,morethan25.

---
## API Endpoint: Global Searh

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/products/search?query={name}&userId={userId}`

---


## API Endpoint: Get Products By category

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getProductByCategory?category={category}&userId={userId}`

---

## API Endpoint: Get Products By SubCategory

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getProductBySubCategory?subcategory={subcategory}&userId={userId}`

---



## API Endpoint: Get Top Selling Products

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getTopSellingProducts?&subcategory={subCategory}&userId={userId}`


## API Endpoint: Update Price By Grams

### Method
- **Method**: PUT

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/updatePriceByQty`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
    
    "productId": "string",
    "grams":int
}

```

## API Endpoint: Get Top Selling categories

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getTopSellingCategories`







## API Endpoint: Get All Categories

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/category`

---
<br>
<br>
<br>



<br>

# WishList
<br>


## API Endpoint: Add Product in WishLists

### Method
- **Method**: POST

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/addProductInWishList`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
    "userId": "string",
    "productId": "string"
}

```

## API Endpoint: Add CartItem in WishLists Or Save For Later

### Method
- **Method**: POST

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/SaveForLater`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
    "userId": "string",
    "productId": "string"
}

```


## API Endpoint: Get User Product WishList

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getUserWishList?userId={userId}`

---



## API Endpoint: Remove Product From WishList

### Method
- **Method**: DELETE

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/removeProductInWishList?userId={userId}&productId={productId}`

---






<br>
<br>
<br>

# Offers


## API Endpoint: Get All Offers

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getAllOffers`

---


## API Endpoint: Get All Products In Offer  By OfferId

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getOffersProductsByOffersId/{offerId} `

---



## API Endpoint: Add Product Reviews

### Method
- **Method**: Post

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/addProductReview`

## Content-Type

- **Content-Type**: `application/json`

## Request Body

The request body should be a JSON object with the following fields:

```json
{
  "productId": "string",
  "userId": "string",
  "rating": int  "between 1 to 5",
  "review": "string"
}


```


## API Endpoint: Get All Products Reviews

### Method
- **Method**: GET

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getProductReview/{productId}`

---




<br>
<br>
<br>

# Order


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
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/getAvailableDeliverySlots?day={day}`

   ## Query Parameters
       ### day: (required) The day for which to retrieve available delivery slots. Can be one of the following values:
       ### today: Get slots for the current day.
       ### tomorrow: Get slots for the next day.
       ### YYYY-MM-DD: Get slots for a specific date in the YYYY-MM-DD format.








## API Endpoint: Create use and Addresss

### Method
- **Method**: POST

### URL
- **URL**: `https://09ubwkjphb.execute-api.us-east-1.amazonaws.com/createUserAndAddress`

### Content-Type
- **Content-Type**: `application/json`

### Request Body
The request body should be a JSON object with the following fields:
```json
{
   "name": "string",
   "email": "string",
   "phoneNumber": "string",
   "flat": "string",
   "block": "string",
   "apartment": "string",
   "area": "string",
   "zipCode": "string"
}


```
