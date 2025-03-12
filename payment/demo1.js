const crypto = require('crypto');

const USERNAME = "umran";
const PASSWORD = "X7b9T3mL";

const authHash = crypto.createHash('sha256').update(`${USERNAME}:${PASSWORD}`).digest('hex');

console.log("Authorization Header:", authHash)