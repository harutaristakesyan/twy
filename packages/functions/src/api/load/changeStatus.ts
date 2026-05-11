import { middyfy } from "@shared/index";
import type { ChangeLoadStatusResponse } from "@twy/core";
import {
  assertTransition,
  type ChangeLoadStatusEvent,
  ChangeLoadStatusEventSchema,
  changeLoadStatus as changeLoadStatusRecord,
  InvalidTransitionError,
  loadAuthContext,
  PaymentOrderRequiredError,
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

  const { loadId } = event.pathParameters;
  const { status, isChargable = false, chargeAmount = null, comment } = event.body;

  assertTransition(ctx, "loads", status);

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
    if (err instanceof PaymentOrderRequiredError) {
      throw Object.assign(createError(400, err.message), { code: err.code });
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
