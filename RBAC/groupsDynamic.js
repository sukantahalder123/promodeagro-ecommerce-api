
const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
    region: 'us-east-1', 
    endpoint: 'http://localhost:8000' 
  });
  
  const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

// Function to fetch all groups from a specific user pool
module.exports.fetchDynamicGroups = async (event) => {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    try {

       const dynamicGroupPermissions = {};

        // Process each group and permissions
        const { group, permissions } = JSON.parse(event.body);

        // Dynamically assign permissions based on group and add to the database
        if (group === 'admin' || group === 'user') {
            try {
                console.log("&&&&")
                // Fetch existing permissions from the database
                const existingPermissions = await getPermissionsFromDatabase(group);
            console.log("&&&&",existingPermissions)
        
                // Merge the existing permissions with the new permissions
                const updatedPermissions = existingPermissions.concat(permissions);
                console.log("*****",updatedPermissions)

                // Update or insert the permissions in the database for the specified group
                await updatePermissionsInDatabase(group, updatedPermissions);

                // Assign the updated permissions to dynamicGroupPermissions
                dynamicGroupPermissions[group] = updatedPermissions;
            } catch (error) {
                console.error(`Error updating permissions for group ${group} in the database:`, error);
                throw error;
            }
        }

        return dynamicGroupPermissions;
    } catch (error) {
        console.error('Error fetching groups from user pool:', error);
        throw error;
    }
}

// Function to fetch permissions from the database for a specific group
async function getPermissionsFromDatabase(group) {
    const params = {
        TableName: 'PermissionsTable', 
        KeyConditionExpression: 'groupname = :group',
    ExpressionAttributeValues: {
        ':group': group
    }
    };

    try {
        const data = await dynamoDB.query(params).promise();
       
        console.log("!!!",data.Items.map(item => item.permissions))
        const nestedArray =data.Items.map(item => item.permissions);
        const flattenedArray = nestedArray.flat(Infinity);
        console.log(flattenedArray);
        return flattenedArray || [];

    } catch (error) {
        console.error(`Error fetching permissions for group ${group} from the database:`, error);
        throw error;
    }
}

// Function to update or insert permissions in the database for a specific group
async function updatePermissionsInDatabase(group, permissions) {
    const params = {
        TableName: 'PermissionsTable', 
        Item: {
            'groupname': group,
            'permissions': permissions
        }
    };

    try {
        await dynamoDB.put(params).promise();
    } catch (error) {
        console.error(`Error updating permissions for group ${group} in the database:`, error);
        throw error;
    }
}



