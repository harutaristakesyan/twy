import { middyfy } from "@shared/index";
import type { CreateLoadResponse } from "@twy/core";
import {
  type CreateLoadEvent,
  CreateLoadEventSchema,
  createLoad as createLoadRecord,
  getFullUserInfoById,
  type LoadFileInput,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const createLoad = async (event: CreateLoadEvent): Promise<CreateLoadResponse> => {
  const {
    customer,
    referenceNumber,
    customerRate,
    contactName,
    carrier,
    carrierPaymentMethod,
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
    pickup,
    dropoff,
    files,
  } = event.body;

  const {
    requestContext: {
      authUser: { userId },
    },
  } = event;

  const user = await getFullUserInfoById(userId);

  if (!user.branch?.id) {
    throw new createError.BadRequest("User is not assigned to a branch");
  }

  const branchId = user.branch.id;

  const normalizedFiles: LoadFileInput[] | undefined = files?.map((file: LoadFileInput) => ({
    id: file.id,
    fileName: file.fileName,
  }));

  const loadId = await createLoadRecord({
    customer,
    referenceNumber,
    customerRate,
    contactName,
    carrier,
    carrierPaymentMethod,
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
    pickupCityZipCode: typeof pickup.cityZipCode === "undefined" ? null : pickup.cityZipCode,
    pickupPhone: pickup.phone,
    pickupCarrier: pickup.carrier,
    pickupName: pickup.name,
    pickupAddress: pickup.address,
    dropoffCityZipCode: typeof dropoff.cityZipCode === "undefined" ? null : dropoff.cityZipCode,
    dropoffPhone: dropoff.phone,
    dropoffCarrier: dropoff.carrier,
    dropoffName: dropoff.name,
    dropoffAddress: dropoff.address,
    branchId,
    files: normalizedFiles,
  });

  return {
    message: "Load created successfully",
    loadId,
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
