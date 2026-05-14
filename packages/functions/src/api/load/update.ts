import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  assertPermission,
  FinancialsLockedError,
  LoadEditBlockedByStatusError,
  type LoadFileInput,
  loadAuthContext,
  type UpdateLoad,
  type UpdateLoadEvent,
  UpdateLoadEventSchema,
  updateLoad as updateLoadRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const updateLoad = async (event: UpdateLoadEvent): Promise<MessageResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "loads", "edit");

  const { loadId } = event.pathParameters;
  const { files, ...rest } = event.body;

  const payload: UpdateLoad = { ...rest };

  if (typeof files !== "undefined") {
    payload.files = files?.map((file: LoadFileInput) => ({
      id: file.id,
      fileName: file.fileName,
    }));
  }

  let updated: boolean;
  try {
    updated = await updateLoadRecord(loadId, payload);
  } catch (err) {
    if (err instanceof LoadEditBlockedByStatusError) {
      throw Object.assign(new createError.Conflict(err.message), {
        code: err.code,
        loadStatus: err.loadStatus,
      });
    }
    if (err instanceof FinancialsLockedError) throw new createError.Conflict(err.message);
    throw err;
  }

  if (!updated) {
    throw new createError.NotFound("Load not found");
  }

  return { message: "Load updated successfully" };
};

export const handler = middyfy<
  UpdateLoadEvent,
  MessageResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(updateLoad, {
  eventSchema: UpdateLoadEventSchema,
  mode: "parse",
});
