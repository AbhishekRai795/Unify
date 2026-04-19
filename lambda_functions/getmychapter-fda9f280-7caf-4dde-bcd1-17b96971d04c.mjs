import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({ region: "your-region" });

export const handler = async (event) => {
  try {
    const email = event.requestContext.authorizer.jwt.claims.email;

    const params = {
      TableName: "chapter-heads",
      Key: {
        email: { S: email }
      }
    };

    const command = new GetItemCommand(params);
    const response = await ddb.send(command);

    if (!response.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Chapter head not found" }),
      };
    }

    const data = unmarshall(response.Item);

    return {
      statusCode: 200,
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        chapter: data.chapter,
        status: data.status || "unknown"
      }),
    };
  } catch (err) {
    console.error("Error getting chapter head:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
