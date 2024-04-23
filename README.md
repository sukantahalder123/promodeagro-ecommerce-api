
# promodeagro-ecommerce-api
promodeagro   ecommerce backend Lambda  API's


## Table of Contents
1. [Introduction](#introduction)
2. [Cloning Process](#cloning-process)
    - [Cloning the Repository](#cloning-the-repository)
    - [Setting Up Environment](#setting-up-environment)
3. [API Overview](#api-overview)
    - [Authentication](#authentication)
    - [Endpoints](#endpoints)
4. [Endpoints](#endpoints)
    - [Customer Management](#Customer-management)
    - [Inventory Management](#Inventory-management)
    - [Order Management](#Order-management)
    - [Products Management](#Products-management)
    - [Users Management](#Users-management)
    - [Login Management](#Login-management)
    - [Webhook Management](#Webhook-management)
    - [OrderBills Management](#OrderBills-management)
5. [Serverless Setup](#serverless-setup)
    - [Installation](#installation)
    - [Configuration](#configuration)
6. [Serverless Offline](#serverless-offline)
7. [Deployment](#deployment)
8. [Conclusion](#conclusion)

## Introduction
Welcome to the documentation for our eCommerce APIs! These APIs provide essential functionalities for managing Catalog, Customer,Inventory,Order,Products and Users.

## Cloning Process
To get started with our APIs, you'll need to clone the repository and set up your development environment.

### Cloning the Repository
To clone the repository, use the following command:

```bash
git clone https://github.com/promodeagro  -ecommerce/promodeagro  -ecommerce-api.git 

```

### Setting Up Environment :
After cloning the repository, navigate to the project directory and follow these steps:
1. Install dependencies:

```bash
npm install
 ```
2. Set up environment variables:
Update the .env file with your environment-specific configurations.
Replace the empty values (=) with your specific configurations for each variable.
For example:
```bash REGION:Your Region
FACEBOOK_GRAPH_API_URL: The URL for Facebook's Graph API.
FACEBOOK_ACCESS_TOKEN: Access token for accessing Facebook services.
DYNAMODB_TABLE_NAME: Name of the DynamoDB table.
ORDER_TABLE_NAME: Name of the table for storing orders.
CUSTOMER_TABLE_NAME: Name of the table for storing customer data.
PRODUCT_TABLE_NAME: Name of the table for storing product data.
Catalog_TABLE_NAME:Name of the table for storing Catalog data.
Inventory_TABLE_NAME:Name of the table for storing Inventory data.
```
Fill in the values accordingly based on your environment and requirements. After updating the .env file, make sure your application or scripts are configured to read these environment variables from the file.

```bash
      .env
```
Ensure that all required environment variables are correctly set in the .env file.

### Authentication :
1. The APIs use JWT (JSON Web Tokens) for authentication. To obtain a token, send a POST request to /api/auth/login with your credentials.
2. The require('dotenv').config() line loads environment variables from a .env file to access sensitive data securely.
3. Environment variables are essential for configuring AWS SDK and accessing Cognito user pool ID securely without hardcoding them in the code.

### Endpoints :
  Here are the main endpoint categories:

  ```bash
 GET /getAllOrders: Retrieves all orders.
POST /createOrder: Creates a new order.
GET /getOrderById/{id}: Retrieves an order by its ID.
PUT /updateOrder/{id}: Updates an existing order by its ID.
DELETE /deleteOrderById/{id}: Deletes an order by its ID.
POST /product: Creates a new product.
PUT /product: Updates an existing product.
GET /product: Retrieves all products.
POST /sendBills: Sends bills.
POST /customerinsert: Inserts a new customer.
GET /getAllCustomer: Retrieves all customers.
GET /getCustomerById/{customerId}: Retrieves a customer by their ID.
PUT /updateCustomer/{customerId}: Updates a customer by their ID.
DELETE /deleteCustomerById/{customerId}: Deletes a customer by their ID.
POST /webhook: Handles webhook requests.
POST /dev/inventory: Creates a new inventory item.
PUT /dev/updateInventory/{id}: Updates an inventory item by its ID.
GET /dev/getAllInventory: Retrieves all inventory items.
GET /dev/inventory/{id}: Retrieves an inventory item by its ID.
DELETE /dev/inventory/{id}: Deletes an inventory item by its ID.
GET /dev/getAllUsers: Retrieves all users.
GET /dev/getByUserName: Retrieves a user by their username.
GET /dev/get-users-by-role-in-group: Retrieves users by their role in a group.
GET /dev/getAllUsersEmail: Retrieves all users' emails.
POST /dev/signUp: Signs up a new user.
POST /dev/signIn: Signs in a user.
```
These endpoints cover a wide range of functionalities including order management, product management, customer management, webhook handling, inventory management, and user management.

### Serverless Setup :
Our APIs are built using the Serverless framework for easy deployment.
  ### Installation
To install Serverless globally, run:
```bash 
npm install -g serverless
```
 ### Serverless Offline:
You can test the APIs locally using Serverless Offline .
```bash 
  Serverless Offline
  ```

 ### Deployment :
Deploy the APIs to your preferred cloud provider using Serverless.
1. Make sure you're in the root directory of your Serverless project.
2. Run the following command to deploy your APIs to AWS:
```bash
sls deploy
```
### Conclusion :
In short, our eCommerce API guide helps developers add important features easily. It explains how to set up and authenticate, manage catalog, customers, orders, products, and users. Using Serverless makes deploying.
