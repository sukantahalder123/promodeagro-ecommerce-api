const { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

const categoryTable = process.env.CATEGORY_TABLE;


module.exports.handler = async (event) => {


    try {
        const { categoryName, subcategories } = JSON.parse(event.body);
        const categoryID = uuidv4();
        const params = {
            TableName: categoryTable,
            Item: marshall({
                categoryId: categoryID,
                CategoryName: categoryName,
                Subcategories: subcategories || [],
            }),
        };
        await dynamoDB.send(new PutItemCommand(params));
        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Category added successfully', categoryID }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not add category' }),
        };
    }
};
