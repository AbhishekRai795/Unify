import {
  DynamoDBClient,
  QueryCommand
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "your-region" });
const TABLE_NAME = "chapter-students";

export const handler = async (event) => {
  const chapterName = event.queryStringParameters?.chapter;

  if (!chapterName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Chapter name is required" })
    };
  }

  const params = {
    TableName: TABLE_NAME,
    IndexName: "chapter-index", // Only if using GSI on `chapter`
    KeyConditionExpression: "chapter = :c",
    ExpressionAttributeValues: {
      ":c": { S: chapterName }
    }
  };

  try {
    const result = await dynamo.send(new QueryCommand(params));
    const students = result.Items.map(item => ({
      email: item.email.S,
      name: item.name.S,
      chapter: item.chapter.S
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ students })
    };
  } catch (err) {
    console.error("Error fetching students:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unable to fetch students" })
    };
  }
};
