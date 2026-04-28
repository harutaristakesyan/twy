import { ZodError, ZodType } from "zod";
import middy from "@middy/core";
import createError, { isHttpError } from "http-errors";

export type HttpZodHandlerMode = "validate" | "parse";

export type HttpZodHandlerOptions = {
  /**
   *  Zod schema to validate incoming event. Skip it if you do not need event validation.
   */
  eventSchema?: ZodType;
  /**
   * Zod handler mode to either only validate that object matches scheme or also replace event by parsed object
   * @default validate
   */
  mode?: HttpZodHandlerMode;
};

export const httpZodHandler = (
  options?: HttpZodHandlerOptions,
): middy.MiddlewareObj => {
  return {
    before: (request): void | createError.HttpError => {
      if (!options?.eventSchema) {
        return;
      }

      const parsedEvent: unknown = options.eventSchema.parse(request.event);

      if (options?.mode === "parse") {
        request.event = parsedEvent;
      }
    },
    onError: (request: middy.Request) => {
      const { error } = request;
      if (isHttpError(error)) {
        return;
      }

      if (error instanceof ZodError) {
        const httpError = new createError.BadRequest(
          JSON.stringify({
            message: "Request validation failed",
            details: error.issues,
          }),
        );
        httpError.expose = true;
        request.error = httpError;
      }
    },
  };
};
