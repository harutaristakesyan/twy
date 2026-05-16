import { middyfy } from "@shared/index";
import type { CreateLoadResponse } from "@twy/core";
import {
  assertPermission,
  type CreateLoadEvent,
  CreateLoadEventSchema,
  createLoad as createLoadRecord,
  getFullUserInfoById,
  type LoadFileInput,
  loadAuthContext,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const createLoad = async (event: CreateLoadEvent): Promise<CreateLoadResponse> => {
  const {
    brokerId,
    customerRate,
    carrierId,
    carrierRate,
    chargeServiceFeeToOffice,
    loadType,
    serviceType,
    serviceGivenAs,
    commodity,
    bookedAs,
    soldAs,
    weight,
    temperature,
    pickups,
    dropoffs,
    files,
  } = event.body;

  const {
    requestContext: {
      authUser: { userId },
    },
  } = event;

  const ctx = await loadAuthContext(userId);
  assertPermission(ctx, "loads", "add");

  const user = await getFullUserInfoById(userId);

  if (!user.branch?.id) {
    throw new createError.BadRequest("User is not assigned to a branch");
  }

  const branchId = user.branch.id;

  const normalizedFiles: LoadFileInput[] | undefined = files?.map((file: LoadFileInput) => ({
    id: file.id,
    fileName: file.fileName,
  }));

  const { loadId, referenceNumber } = await createLoadRecord({
    brokerId,
    customerRate,
    carrierId,
    carrierRate,
    chargeServiceFeeToOffice,
    loadType,
    serviceType,
    serviceGivenAs,
    commodity,
    bookedAs,
    soldAs,
    weight,
    temperature,
    pickups,
    dropoffs,
    branchId,
    createdBy: userId,
    files: normalizedFiles,
  });

  return {
    message: "Load created successfully",
    loadId,
    referenceNumber,
  };
};

export const handler = middyfy<
  CreateLoadEvent,
  CreateLoadResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(createLoad, {
  eventSchema: CreateLoadEventSchema,
  mode: "parse",
});
