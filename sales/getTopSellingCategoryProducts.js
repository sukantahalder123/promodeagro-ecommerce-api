'use strict';

const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
require('dotenv').config();

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

const SALES_TABLE_NAME = process.env.SALES_TABLE || "sales";

exports.handler = async (event) => {
    try {
        // Step 1: Fetch all sales records
        const scanParams = { TableName: SALES_TABLE_NAME };
        const scanResult = await dynamoDB.send(new ScanCommand(scanParams));
        const sales = scanResult.Items.map(item => unmarshall(item));

        // Step 2: Aggregate sales data by subcategory
        const subcategoryCounts = sales.reduce((acc, sale) => {
            const { Subcategory, Quantity } = sale;
            if (!acc[Subcategory]) acc[Subcategory] = 0;
            acc[Subcategory] += Quantity;
            return acc;
        }, {});

        // Step 3: Format the result to get list of subcategories
        const topSellingSubcategories = Object.keys(subcategoryCounts);

        return {
            statusCode: 200,
            body: JSON.stringify({ topSellingSubcategories }),
        };
    } catch (error) {
        console.error('Error fetching top-selling subcategories:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch data', error }),
        };
    }
};
