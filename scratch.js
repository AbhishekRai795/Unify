import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "ap-south-1" }));
client.send(new ScanCommand({ TableName: "Certificates" }))
  .then(res => console.log(JSON.stringify(res.Items, null, 2)))
  .catch(err => console.error(err));
