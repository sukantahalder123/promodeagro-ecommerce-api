const AWS = require('aws-sdk');
const { algoliasearch } = require("algoliasearch");
require('dotenv').config();


// Algolia setup
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME;

const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

exports.handler = async (event) => {
  console.log('DynamoDB Stream Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const eventName = record.eventName;  // INSERT, MODIFY, REMOVE
    const keys = record.dynamodb.keys;
    console.log(`Processing ${eventName} event`);

    if (eventName === 'INSERT' || eventName === 'MODIFY') {
      const newImage = record.dynamodb.NewImage;
      const product = AWS.DynamoDB.Converter.unmarshall(newImage);

      // Make sure Algolia gets an objectID (unique key for each record in Algolia)
      const objectToSave = {
        ...product,
        objectID: product.id, // use your unique identifier field
      };

      try {
        await algoliaClient.saveObject({
          indexName: ALGOLIA_INDEX_NAME,
          body: objectToSave,
        });
        console.log(`Successfully updated Algolia object: ${objectToSave}`);
      } catch (error) {
        console.error('Error updating Algolia:', error);
      }
    }

    if (eventName === 'REMOVE') {
      const oldImage = keys;
      console.log('oldImage', oldImage);
      const product = AWS.DynamoDB.Converter.unmarshall(oldImage);
      console.log('product', product);
      const objectID = product.id
      console.log('objectID', objectID);
      try {
        await algoliaClient.deleteObject(objectID);
        console.log(`Successfully deleted Algolia object: ${objectID}`);
      } catch (error) {
        console.error('Error deleting from Algolia:', error);
      }
    }
  }
};
