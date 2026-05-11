import { middyfy } from "@shared/index";
import {
  assertPermission,
  type ListLoadCommentsEvent,
  ListLoadCommentsEventSchema,
  type LoadCommentsResponse,
  listLoadComments,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const listLoadCommentsHandler = async (
  event: ListLoadCommentsEvent,
): Promise<LoadCommentsResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "loads", "view");

  const { loadId } = event.pathParameters;

  const comments = await listLoadComments(loadId);

  return { comments };
};

export const handler = middyfy<
  ListLoadCommentsEvent,
  LoadCommentsResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(listLoadCommentsHandler, {
  eventSchema: ListLoadCommentsEventSchema,
  mode: "parse",
});
