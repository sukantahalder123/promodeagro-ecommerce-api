const { Client } = require('pg');

// Replace these values with your PostgreSQL connection details
const dbConfig = {
    user: '',
    password: '',
    host: '', // e.g., 'localhost' or 'your_database.amazonaws.com'
    database: '',
    port: '', // Default PostgreSQL port

};

// Create a new PostgreSQL client
const client = new Client(dbConfig);

// Function to connect to the database


// Function to connect to the database
async function connectToDatabase() {
    try {
        await client.connect(); // Connect to the database
        console.log('Connected to PostgreSQL');
    } catch (error) {
        console.error('Error connecting to PostgreSQL:', error.message);
        throw error;
    }
}

// Export the PostgreSQL client and the connectToDatabase function
module.exports = {
    client,
    connectToDatabase,
};