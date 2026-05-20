import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const getAuthorizedUserId = (requestContext) => {
  const authorizer = requestContext.authorizer || {};
  return (
    authorizer.claims?.sub ||
    authorizer.jwt?.claims?.sub ||
    authorizer.principalId ||
    null
  );
};

const getUserIdFromToken = (token) => {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    
    // Validate expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn("Token has expired");
      return null;
    }
    
    return payload.sub || null;
  } catch (err) {
    console.error("Failed to parse token:", err);
    return null;
  }
};

export const handler = async (event) => {
  const { routeKey, connectionId } = event.requestContext;
  let userId = getAuthorizedUserId(event.requestContext);

  if (!userId) {
    const token = event.queryStringParameters?.token || event.queryStringParameters?.Token;
    if (token) {
      userId = getUserIdFromToken(token);
    }
  }

  try {
    if (routeKey === "$connect") {
      if (!userId) {
        return { statusCode: 401, body: "Unauthorized" };
      }

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `CONN#${connectionId}`,
          userId,
          connectionId,
          ttl: Math.floor(Date.now() / 1000) + 3600
        }
      }));
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `CONN#${connectionId}`,
          SK: `CONN#${connectionId}`,
          userId,
          connectionId,
          ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL for safety
        }
      }));
      return { statusCode: 200, body: "Connected" };
    }

    if (routeKey === "$disconnect") {
      const lookup = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONN#${connectionId}`,
          SK: `CONN#${connectionId}`
        }
      }));
      const connectedUserId = lookup.Item?.userId || userId;

      if (!connectedUserId) {
        return { statusCode: 200, body: "Disconnected" };
      }

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${connectedUserId}`,
          SK: `CONN#${connectionId}`
        }
      }));
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONN#${connectionId}`,
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
