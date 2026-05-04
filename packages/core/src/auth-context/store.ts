import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import type { UserPermissionsContext } from "../team/repository.js";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const getCachedAuthContext = async (
  userId: string,
): Promise<UserPermissionsContext | null> => {
  const result = await ddb.send(
    new GetCommand({
      TableName: Resource.AuthContext.name,
      Key: { userId },
    }),
  );
  const item = result.Item;
  if (
    !item ||
    typeof item.userId !== "string" ||
    typeof item.permissions !== "object" ||
    typeof item.branchRestricted !== "boolean" ||
    typeof item.onlyOwnData !== "boolean"
  ) {
    return null;
  }
  return item as UserPermissionsContext;
};

export const putAuthContext = async (ctx: UserPermissionsContext): Promise<void> => {
  await ddb.send(
    new PutCommand({
      TableName: Resource.AuthContext.name,
      Item: { ...ctx, updatedAt: new Date().toISOString() },
    }),
  );
};

export const deleteAuthContext = async (userId: string): Promise<void> => {
  await ddb.send(
    new DeleteCommand({
      TableName: Resource.AuthContext.name,
      Key: { userId },
    }),
  );
};
