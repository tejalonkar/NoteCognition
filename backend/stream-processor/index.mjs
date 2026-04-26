import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const apiGwClient = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT
});
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const newItem = unmarshall(record.dynamodb.NewImage);
      
      // Skip connection items themselves
      if (newItem.SK.startsWith("CONN#")) continue;

      const ownerId = newItem.ownerId;
      if (!ownerId) continue;

      // 1. Find all active connections for this user
      const connections = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${ownerId}`,
          ":sk": "CONN#"
        }
      }));

      // 2. Blast updates to all connections
      const postCalls = connections.Items.map(async ({ SK }) => {
        const connectionId = SK.split("#")[1];
        try {
          await apiGwClient.send(new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              type: "NOTE_UPDATED",
              payload: newItem
            })
          }));
        } catch (e) {
          if (e.name === "GoneException") {
            // Cleanup stale connection
            console.log(`Cleaning up stale connection: ${connectionId}`);
          } else {
            console.error("Failed to send message:", e);
          }
        }
      });

      await Promise.all(postCalls);
    }
  }
};
