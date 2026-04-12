import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  const { httpMethod, path, body: bodyString, requestContext } = event;
  const userId = requestContext.authorizer?.claims?.sub || "anonymous";
  const body = bodyString ? JSON.parse(bodyString) : {};

  try {
    if (httpMethod === "POST" && path === "/resource") {
      const { id, parentId, type, title, preview } = body;
      const item = {
        PK: `PARENT#${parentId || 'ROOT'}`,
        SK: `${type.toUpperCase()}#${id}`,
        id, parentId: parentId || 'ROOT', type, title,
        preview: preview || "",
        ownerId: userId,
        updatedAt: new Date().toISOString(),
      };
      await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return response(201, item);
    }

    if (httpMethod === "PUT" && path.startsWith("/file/")) {
      const fileId = path.split("/")[2];
      const { content, title, preview, parentId } = body;
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PARENT#${parentId || 'ROOT'}`, SK: `FILE#${fileId}` },
        UpdateExpression: "SET content = :c, title = :t, preview = :p, updatedAt = :u",
        ExpressionAttributeValues: { ":c": content, ":t": title, ":p": preview, ":u": new Date().toISOString() }
      }));
      return response(200, { message: "File updated" });
    }

    if (httpMethod === "GET" && path.startsWith("/folder/")) {
      const folderId = path.split("/")[2];
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `PARENT#${folderId}` }
      }));
      return response(200, result.Items);
    }
    return response(404, { error: "Route not found" });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});
