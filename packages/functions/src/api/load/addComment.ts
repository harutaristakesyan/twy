import { middyfy } from "@shared/index";
import {
  type AddLoadCommentEvent,
  AddLoadCommentEventSchema,
  type AddLoadCommentResponse,
  addLoadComment,
  assertPermission,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const addLoadCommentHandler = async (
  event: AddLoadCommentEvent,
): Promise<AddLoadCommentResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "loads", "edit");

  const { loadId } = event.pathParameters;
  const { body: commentBody } = event.body;

  const commentId = await addLoadComment(loadId, userId, commentBody);

  return { message: "Comment added successfully", commentId };
};

export const handler = middyfy<
  AddLoadCommentEvent,
  AddLoadCommentResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(addLoadCommentHandler, {
  eventSchema: AddLoadCommentEventSchema,
  mode: "parse",
});
