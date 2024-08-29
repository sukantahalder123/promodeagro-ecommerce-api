const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

const categoryTable = process.env.CATEGORY_TABLE;

module.exports.handler = async (event) => {
    try {
        const { categoryId, newSubcategories } = JSON.parse(event.body);

        // Get the existing category
        const getParams = {
            TableName: categoryTable,
            Key: marshall({ categoryId }),
        };

        const getResult = await dynamoDB.send(new GetItemCommand(getParams));

        if (!getResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Category not found' }),
            };
        }

        const category = unmarshall(getResult.Item);
        const updatedSubcategories = [...category.Subcategories, ...newSubcategories];

        // Update the category with new subcategories
        const updateParams = {
            TableName: categoryTable,
            Key: marshall({ categoryId }),
            UpdateExpression: 'SET Subcategories = :subcategories',
            ExpressionAttributeValues: marshall({
                ':subcategories': updatedSubcategories,
            }),
        };

        await dynamoDB.send(new UpdateItemCommand(updateParams));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Subcategories added successfully' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not update category' }),
        };
    }
};
