
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const client = new SecretsManagerClient({ region: "ap-south-1" });

module.exports.handler = async (event) => {
    try {
        const command = new GetSecretValueCommand({ SecretId: 'algolia-secrets' });
        const response = await client.send(command);

        if (response.SecretString) {
            return JSON.parse(response.SecretString);
        }

        return response.SecretBinary;

    } catch (error) {
        console.error('Error fetching product:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Failed to fetch secret', error }) };
    }
};
