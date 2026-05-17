import { middyfy, toError } from "@shared/index";
import {
  type GetRouteEvent,
  GetRouteEventSchema,
  type GetRouteResponse,
  type RouteGeometry,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

interface OsrmRoute {
  geometry: RouteGeometry;
  distance: number;
  duration: number;
}

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
  message?: string;
}

const getRoute = async (event: GetRouteEvent): Promise<GetRouteResponse> => {
  const { coordinates } = event.body;
  const coordStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new createError.BadGateway(`OSRM responded with ${res.status}`);
    }
    const osrm = (await res.json()) as OsrmResponse;
    const route = osrm.routes?.[0];
    if (osrm.code !== "Ok" || !route) {
      throw new createError.NotFound(`OSRM could not find a route: ${osrm.code}`);
    }
    return {
      geometry: route.geometry,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (error) {
    if (createError.isHttpError(error)) {
      throw error;
    }
    throw new createError.BadGateway(`OSRM request failed: ${toError(error).message}`);
  }
};

export const handler = middyfy<
  GetRouteEvent,
  GetRouteResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(getRoute, {
  eventSchema: GetRouteEventSchema,
  mode: "parse",
});
