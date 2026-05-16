import { middyfy } from "@shared/index";
import type { LoadRecord } from "@twy/core";
import {
  assertPermission,
  buildScope,
  type GetLoadEvent,
  GetLoadEventSchema,
  getLoadById,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const getLoad = async (event: GetLoadEvent): Promise<LoadRecord> => {
  const { userId } = event.requestContext.authUser;
  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "loads", "view");

  const { loadId } = event.pathParameters;
  const load = await getLoadById(loadId);
  if (load === null) {
    throw new createError.NotFound("Load not found");
  }

  const scope = buildScope(ctx);
  if (scope.denyAll) {
    throw new createError.NotFound("Load not found");
  }
  if (scope.branchId && load.branchId !== scope.branchId) {
    throw new createError.NotFound("Load not found");
  }

  return load;
};

export const handler = middyfy<GetLoadEvent, LoadRecord, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getLoad,
  { eventSchema: GetLoadEventSchema, mode: "parse" },
);
