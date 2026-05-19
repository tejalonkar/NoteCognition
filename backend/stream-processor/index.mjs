import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const apiGwClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT
});
const TABLE_NAME = process.env.TABLE_NAME;

const getOwnerId = (record) => {
  const image = record.dynamodb.NewImage || record.dynamodb.OldImage;
  if (!image) return null;
  const item = unmarshall(image);
  return item.ownerId || null;
};

const deleteConnection = async (userId, connectionId) => {
  await Promise.all([
    docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `CONN#${connectionId}` },
    })),
    docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `CONN#${connectionId}`, SK: `CONN#${connectionId}` },
    })),
  ]);
};

const broadcastToUser = async (ownerId, message) => {
  const connections = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${ownerId}`,
      ":sk": "CONN#"
    }
  }));

  const postCalls = (connections.Items || []).map(async ({ SK }) => {
    const connectionId = SK.split("#")[1];
    try {
      await apiGwClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      }));
    } catch (e) {
      if (e.name === "GoneException") {
        console.log(`Cleaning up stale connection: ${connectionId}`);
        await deleteConnection(ownerId, connectionId);
      } else {
        console.error("Failed to send message:", e);
      }
    }
  });

  await Promise.all(postCalls);
};

export const handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const newItem = unmarshall(record.dynamodb.NewImage);
      
      // Skip connection items themselves
      if (newItem.SK.startsWith("CONN#")) continue;

      const ownerId = newItem.ownerId;
      if (!ownerId) continue;

      await broadcastToUser(ownerId, {
        type: newItem.type === "folder" ? "FOLDER_UPDATED" : "NOTE_UPDATED",
        payload: newItem
      });
    }

    if (record.eventName === "REMOVE") {
      const oldItem = unmarshall(record.dynamodb.OldImage);
      if (oldItem.SK.startsWith("CONN#")) continue;

      const ownerId = getOwnerId(record);
      if (!ownerId) continue;

      await broadcastToUser(ownerId, {
        type: oldItem.type === "folder" ? "FOLDER_DELETED" : "NOTE_DELETED",
        payload: {
          id: oldItem.id,
          type: oldItem.type,
          parentId: oldItem.parentId,
          updatedAt: new Date().toISOString()
        }
      });
    }
  }
};
