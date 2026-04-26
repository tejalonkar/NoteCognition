import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  const { routeKey, connectionId } = event.requestContext;
  
  // Note: For real apps, we should verify the JWT token passed in query string on $connect
  // For now, we'll assume a 'demo-user' or extract from query if present
  const userId = event.queryStringParameters?.userId || "demo-user";

  try {
    if (routeKey === "$connect") {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `CONN#${connectionId}`,
          ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL for safety
        }
      }));
      return { statusCode: 200, body: "Connected" };
    }

    if (routeKey === "$disconnect") {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `CONN#${connectionId}`
        }
      }));
      return { statusCode: 200, body: "Disconnected" };
    }

    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("WS Error:", error);
    return { statusCode: 500, body: error.message };
  }
};
