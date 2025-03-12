const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const client = new SecretsManagerClient({ region: "ap-south-1" });

const getSecret = async () => {
    try {
        const command = new GetSecretValueCommand({ SecretId: 'algolia-secrets' });
        const response = await client.send(command);

        if (response.SecretString) {
            return JSON.parse(response.SecretString);
        }

        return response.SecretBinary;
    } catch (error) {
        console.error("Error retrieving secret:", error);
        throw new Error("Failed to retrieve secret");
    }
};
