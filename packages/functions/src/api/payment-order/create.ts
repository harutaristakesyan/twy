import { middyfy, toError } from "@shared/index";
import {
  assertPermission,
  type CreatePaymentOrderEvent,
  CreatePaymentOrderEventSchema,
  createPaymentOrderForLoad,
  LoadNotFoundError,
  loadAuthContext,
  PaymentOrderAlreadyExistsError,
  PaymentOrderFinancialsMissingError,
} from "@twy/core";
import { db } from "@twy/db";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";

interface CreatePaymentOrderResponse {
  id: string;
  loadId: string;
}

const createHandler = async (
  event: CreatePaymentOrderEvent,
): Promise<CreatePaymentOrderResponse> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "load_payment_order", "add");

  const { loadId } = event.body;

  try {
    const result = await db.transaction(async (tx) => {
      return createPaymentOrderForLoad(tx, loadId, userId, { strict: true });
    });

    if (!result) {
      throw new errors.InternalServerError("Failed to create payment order");
    }
    return { id: result.id, loadId };
  } catch (err) {
    const e = toError(err);
    if (e instanceof LoadNotFoundError) {
      throw new errors.NotFound(e.message);
    }
    if (e instanceof PaymentOrderAlreadyExistsError) {
      throw new errors.Conflict(e.message);
    }
    if (e instanceof PaymentOrderFinancialsMissingError) {
      throw new errors.UnprocessableEntity(e.message);
    }
    throw err;
  }
};

export const handler = middyfy<
  CreatePaymentOrderEvent,
  CreatePaymentOrderResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createHandler, {
  eventSchema: CreatePaymentOrderEventSchema,
  mode: "parse",
});
