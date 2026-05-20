import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});
const TABLE_NAME = process.env.TABLE_NAME;
const ASSET_BUCKET = process.env.ASSET_BUCKET;
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

const rootParentId = "ROOT";

const getUserId = (requestContext) =>
  requestContext.authorizer?.claims?.sub || "anonymous";

const buildGsiKeys = (userId, updatedAt) => ({
  GSI1PK: `USER#${userId}`,
  GSI1SK: `UPDATED#${updatedAt}`,
});

const safeFileName = (fileName = "image") =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "image";

export const handler = async (event) => {
  const { httpMethod, path, body: bodyString, requestContext } = event;
  const userId = getUserId(requestContext);
  const body = bodyString ? JSON.parse(bodyString) : {};

  try {
    if (httpMethod === "OPTIONS") {
      return response(200, {});
    }

    if (httpMethod === "POST" && path === "/resource") {
      const { id, parentId, type, title, preview } = body;
      const now = new Date().toISOString();
      const item = {
        PK: `PARENT#${parentId || rootParentId}`,
        SK: `${type.toUpperCase()}#${id}`,
        id,
        parentId: parentId || rootParentId,
        type,
        title,
        preview: preview || "",
        ownerId: userId,
        updatedAt: now,
        ...buildGsiKeys(userId, now),
      };
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(ownerId) OR ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": userId },
      }));
      return response(201, item);
    }

    if (httpMethod === "POST" && path === "/upload-url") {
      if (!ASSET_BUCKET) {
        return response(500, { error: "Asset bucket is not configured" });
      }

      const { filename, contentType } = body;
      if (!contentType?.startsWith("image/")) {
        return response(400, { error: "Only image uploads are supported" });
      }

      const key = `uploads/${userId}/${Date.now()}-${safeFileName(filename)}`;
      const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
          Bucket: ASSET_BUCKET,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: 300 }
      );

      return response(200, {
        uploadUrl,
        publicUrl: `https://${ASSET_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`,
      });
    }

    if (httpMethod === "PUT" && path.startsWith("/file/")) {
      const fileId = path.split("/")[2];
      const { content, title, preview, parentId, version } = body;
      const now = new Date().toISOString();
      const incomingVersion = version || 1;
      const item = {
        PK: `PARENT#${parentId || rootParentId}`,
        SK: `FILE#${fileId}`,
        id: fileId,
        parentId: parentId || rootParentId,
        type: 'file',
        title,
        content,
        preview: preview || "",
        ownerId: userId,
        updatedAt: now,
        version: incomingVersion,
        ...buildGsiKeys(userId, now),
      };

      try {
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
          ConditionExpression: "(attribute_not_exists(ownerId) OR ownerId = :ownerId) AND (attribute_not_exists(version) OR version <= :incomingVersion)",
          ExpressionAttributeValues: { 
            ":ownerId": userId,
            ":incomingVersion": incomingVersion
          },
        }));
        return response(200, item);
      } catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
          // Fetch existing item to check if owner is correct and version is indeed newer
          const existing = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: `PARENT#${parentId || rootParentId}`,
              SK: `FILE#${fileId}`
            }
          }));
          const existingItem = existing.Item;
          if (existingItem) {
            if (existingItem.ownerId !== userId) {
              return response(403, { error: "Forbidden" });
            }
            if (existingItem.version && existingItem.version > incomingVersion) {
              return response(409, {
                error: "Conflict",
                serverVersion: existingItem.version,
                serverItem: existingItem
              });
            }
          }
          return response(403, { error: "Forbidden" });
        }
        throw error;
      }
    }

    if (httpMethod === "GET" && path === "/sync/pull") {
      const since = event.queryStringParameters?.since;
      const query = {
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: since
          ? "GSI1PK = :pk AND GSI1SK > :since"
          : "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ...(since ? { ":since": `UPDATED#${since}` } : {}),
        },
      };
      const result = await docClient.send(new QueryCommand(query));
      return response(200, result.Items || []);
    }

    if (httpMethod === "DELETE" && path.startsWith("/file/")) {
      const fileId = path.split("/")[2];
      const parentId = event.queryStringParameters?.parentId || rootParentId;
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PARENT#${parentId}`, SK: `FILE#${fileId}` },
        ConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": userId },
      }));
      return response(200, { message: "File deleted", id: fileId });
    }

    if (httpMethod === "DELETE" && path.startsWith("/folder/")) {
      const folderId = path.split("/")[2];
      const parentId = event.queryStringParameters?.parentId || rootParentId;
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PARENT#${parentId}`, SK: `FOLDER#${folderId}` },
        ConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": userId },
      }));
      return response(200, { message: "Folder deleted", id: folderId });
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
    if (error.name === "ConditionalCheckFailedException") {
      return response(403, { error: "Forbidden" });
    }

    return response(500, { error: error.message });
  }
};

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type",
};

const response = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});
