const axios = require('axios');
const { DynamoDBClient, DeleteItemCommand,GetItemCommand} = require('@aws-sdk/client-dynamodb');
require('dotenv').config();
 
const dynamoDB = new DynamoDBClient({
    region: 'us-east-1',
}); 
 
const FACEBOOK_GRAPH_API_URL = process.env.FACEBOOK_GRAPH_API_URL;
const CATALOG_ID = process.env.CATALOG_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
module.exports.deleteProduct = async (event) => {
    try {
        if (!event.body) {
          return {
              statusCode: 400,
              body: JSON.stringify({ message: 'Missing request body' }),
          };
      }
     console.log("$#$#$#$")
      const productData = JSON.parse(event.body);

     
          if (!(productData.id)) {
              return {
                  statusCode: 400,
                  body: JSON.stringify({ message: `Missing required field: ${field}` }),
              };
          }
       

      const getProductParams = {
        TableName: 'Product',
        Key: {
            id: { S: productData.id }
        }
    };

    const getProductResponse = await dynamoDB.send(new GetItemCommand(getProductParams));

    if (!getProductResponse.Item) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: 'Product not found' }),
        };
    }
        // Array of update requests
        const product= {
            "access_token": ACCESS_TOKEN,
             "requests": [
               {
                 "method": "DELETE",
                 "retailer_id":  productData.id,
                 }   
             ]
           }    
         try {
           
          const response = await axios.post(`${FACEBOOK_GRAPH_API_URL}/${CATALOG_ID}/batch`, product)
             
        console.log("###",response)
  
        const params = {
            TableName: 'Product',
            Key: {
                id: { S: productData.id } // Assuming productId is a string
            }
        };
          if(response.status === 200){
            await dynamoDB.send(new DeleteItemCommand(params));
          }
         return {
              statusCode: 200,
              body: JSON.stringify({ message: 'Product deleted successfully' }),
          };
      } catch (error) {
          console.error('Failed to deleted product in database:', error.response ? error.response.data : error.message);
          return {
              statusCode: error.response ? error.response.status : 500,
              body: JSON.stringify({ message: 'Failed to delete product in database', error: error.response ? error.response.data : error.message }),
          };
      }
  } catch (error) {
      console.error('Failed to create product:', error);
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Failed to create product', error: error.message }),
      };
  }
  };
      
  