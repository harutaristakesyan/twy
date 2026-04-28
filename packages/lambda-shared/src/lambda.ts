import middy from "@middy/core";
import middyJsonBodyParser from "@middy/http-json-body-parser";
import type {
  APIGatewayEventRequestContextV2,
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithRequestContext,
  Context,
} from "aws-lambda";
import type { ZodType } from "zod";
import { addAwsRequestId } from "./middy/addAwsRequestId.js";
import { httpJwtExtractor } from "./middy/httpJwtExtractor.js";
import { type HttpZodHandlerMode, httpZodHandler } from "./middy/httpZodHandler.js";
import { jsonErrorHandler } from "./middy/jsonErrorHandler.js";

export type MiddyOptions = Pick<middy.PluginObject, "timeoutEarlyInMillis">;

type LambdaHandler<TEvent = unknown, TResult = unknown, TContext = Context> = (
  event: TEvent,
  context: TContext,
) => Promise<TResult>;

const middlewares = [
  jsonErrorHandler(),
  middyJsonBodyParser({ disableContentTypeError: true }),
  httpJwtExtractor(),
  addAwsRequestId(),
] as middy.MiddlewareObj[];

type HttpMiddifierOptions = MiddyOptions & {
  readonly eventSchema?: ZodType;

  readonly mode?: HttpZodHandlerMode;
};

export const middyfy = <
  TEvent,
  TResult,
  TOriginalEvent extends
    APIGatewayProxyEventV2WithRequestContext<APIGatewayEventRequestContextV2> = APIGatewayProxyEventV2,
  TContext extends Context = Context,
>(
  handler:
    | LambdaHandler<TEvent, TResult, TContext>
    | middy.MiddyfiedHandler<TOriginalEvent, TResult, Error, TContext>,
  options: HttpMiddifierOptions = {},
): middy.MiddyfiedHandler<TOriginalEvent, TResult, Error, TContext> => {
  const { eventSchema, mode } = options;

  if (eventSchema) {
    middlewares.push(httpZodHandler({ eventSchema, mode }));
  }

  return middlewares.reduce((handler, middleware) => handler.use(middleware), wrapHandler(handler));
};

export const wrapHandler = <TEvent, TData, TResult = unknown, TContext extends Context = Context>(
  handler:
    | LambdaHandler<TData, TResult, TContext>
    | middy.MiddyfiedHandler<TEvent, TResult, Error, TContext>,
  opts?: MiddyOptions,
): middy.MiddyfiedHandler<TEvent, TResult, Error, TContext> =>
  "use" in handler
    ? handler
    : (middy(handler, opts) as unknown as middy.MiddyfiedHandler<TEvent, TResult, Error, TContext>);
