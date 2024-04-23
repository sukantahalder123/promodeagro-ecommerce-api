require('dotenv').config();
const { Client } = require('pg');

async function getAllUsers(event) {
    console.log(event);

    // Extract user role from the event context
    const userRole = event.requestContext.authorizer.claims['cognito:groups'];

    // Check if the user has the necessary role to access this function
    if (!userRole || !userRole.includes('admin')) {
        return {
            errors: [
                {
                    message: 'Access denied. Only admins can access this function.',
                    errorType: 'AccessDeniedError'
                }
            ]
        };
    }

    // If the user is an admin, proceed with retrieving all users
    const client = new Client({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT,
        password: process.env.DB_PASSWORD
    });

    client.connect();

    try {
        // Perform the database operation to retrieve all users
        const query = 'SELECT * FROM users';
        const result = await client.query(query);

        const users = result.rows;

        switch (event.field) {
            case "getAllUsers":
                return users;
            default:
                throw new Error("Unknown field, unable to resolve " + event.field);
        }
    } catch (error) {
        console.error('Error retrieving all users:', error);
        return {
            errors: [
                {
                    message: 'Internal Server Error',
                    errorType: 'InternalServerError'
                }
            ]
        };
    } finally {
        // Close the database connection
        await client.end();
    }
}

module.exports = { getAllUsers };
