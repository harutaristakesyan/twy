import { middyfy } from "@shared/index";
import type { MessageResponse } from "@twy/core";
import {
  type LoadFileInput,
  type UpdateLoad,
  type UpdateLoadEvent,
  UpdateLoadEventSchema,
  updateLoad as updateLoadRecord,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

const updateLoad = async (event: UpdateLoadEvent): Promise<MessageResponse> => {
  const { loadId } = event.pathParameters;
  const { pickup, dropoff, files, ...rest } = event.body;

  const payload: UpdateLoad = { ...rest };

  if (typeof files !== "undefined") {
    payload.files = files?.map((file: LoadFileInput) => ({
      id: file.id,
      fileName: file.fileName,
    }));
  }

  if (pickup) {
    if (typeof pickup.cityZipCode !== "undefined") {
      payload.pickupCityZipCode = pickup.cityZipCode;
    }
    if (typeof pickup.phone !== "undefined") {
      payload.pickupPhone = pickup.phone;
    }
    if (typeof pickup.carrier !== "undefined") {
      payload.pickupCarrier = pickup.carrier;
    }
    if (typeof pickup.name !== "undefined") {
      payload.pickupName = pickup.name;
    }
    if (typeof pickup.address !== "undefined") {
      payload.pickupAddress = pickup.address;
    }
  }

  if (dropoff) {
    if (typeof dropoff.cityZipCode !== "undefined") {
      payload.dropoffCityZipCode = dropoff.cityZipCode;
    }
    if (typeof dropoff.phone !== "undefined") {
      payload.dropoffPhone = dropoff.phone;
    }
    if (typeof dropoff.carrier !== "undefined") {
      payload.dropoffCarrier = dropoff.carrier;
    }
    if (typeof dropoff.name !== "undefined") {
      payload.dropoffName = dropoff.name;
    }
    if (typeof dropoff.address !== "undefined") {
      payload.dropoffAddress = dropoff.address;
    }
  }

  const updated = await updateLoadRecord(loadId, payload);

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
