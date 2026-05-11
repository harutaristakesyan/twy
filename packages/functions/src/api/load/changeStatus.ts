import { middyfy } from "@shared/index";
import type { ChangeLoadStatusResponse } from "@twy/core";
import {
  assertPermission,
  type ChangeLoadStatusEvent,
  ChangeLoadStatusEventSchema,
  changeLoadStatus as changeLoadStatusRecord,
  InvalidTransitionError,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const requiresComment = (status: string, isChargable: boolean): boolean =>
  status === "Hold" || status === "Declined" || (status === "Approved" && isChargable);

const changeLoadStatus = async (
  event: ChangeLoadStatusEvent,
): Promise<ChangeLoadStatusResponse> => {
  const changedBy = event.requestContext.authUser.userId;
  const ctx = await loadAuthContext(changedBy);
  assertPermission(ctx, "loads", "edit");

  const { loadId } = event.pathParameters;
  const { status, isChargable = false, chargeAmount = null, comment } = event.body;

  if (requiresComment(status, isChargable) && !comment) {
    throw new createError.BadRequest("A comment is required for this status change");
  }

  try {
    const { updated } = await changeLoadStatusRecord(
      loadId,
      status,
      changedBy,
      isChargable,
      chargeAmount ?? null,
      comment,
    );

    if (!updated) {
      throw new createError.NotFound("Load not found");
    }
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw Object.assign(createError(400, err.message), {
        code: err.code,
        from: err.from,
        to: err.to,
        allowed: err.allowed,
      });
    }
    throw err;
  }

  return {
    message: "Load status updated successfully",
    loadId,
    status,
  };
};

export const handler = middyfy<
  ChangeLoadStatusEvent,
  ChangeLoadStatusResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(changeLoadStatus, {
  eventSchema: ChangeLoadStatusEventSchema,
  mode: "parse",
});
