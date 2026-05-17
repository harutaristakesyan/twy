import { z } from "zod";
import { AuthContext } from "../shared/auth.js";

const MAX_RESULT_LIMIT = 10;
const MIN_QUERY_LENGTH = 1;
const MAX_QUERY_LENGTH = 200;
const MAX_ROUTE_COORDINATES = 25;

export const SearchAddressEventSchema = z.object({
  requestContext: AuthContext,
  queryStringParameters: z.object({
    q: z.string().trim().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH),
    limit: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 5;
        const parsed = Number.parseInt(val, 10);
        return Number.isNaN(parsed) ? 5 : Math.min(Math.max(parsed, 1), MAX_RESULT_LIMIT);
      }),
    lang: z.string().trim().min(2).max(5).optional().default("en"),
  }),
});

export type SearchAddressEvent = z.infer<typeof SearchAddressEventSchema>;

const coordinateSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const GetRouteEventSchema = z.object({
  requestContext: AuthContext,
  body: z.object({
    coordinates: z
      .array(coordinateSchema)
      .min(2, "At least two coordinates are required")
      .max(MAX_ROUTE_COORDINATES, `At most ${MAX_ROUTE_COORDINATES} coordinates are allowed`),
  }),
});

export type GetRouteEvent = z.infer<typeof GetRouteEventSchema>;
