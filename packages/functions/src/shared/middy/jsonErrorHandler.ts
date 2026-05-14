import type { MiddlewareObj } from "@middy/core";
import type { APIGatewayProxyResult } from "aws-lambda";
import { isHttpError } from "http-errors";

const SKIP_PROPS = new Set(["statusCode", "status", "expose", "message", "name", "stack"]);

export const jsonErrorHandler = (): MiddlewareObj => ({
  onError: async (request): Promise<APIGatewayProxyResult> => {
    const { error } = request;

    let statusCode = 500;
    let response: Record<string, unknown> = {};

    if (isHttpError(error)) {
      statusCode = error.statusCode ?? 400;

      const extras = Object.fromEntries(
        Object.entries(error as Record<string, unknown>).filter(([k]) => !SKIP_PROPS.has(k)),
      );

      try {
        const parsed = JSON.parse(error.message);
        response =
          typeof parsed === "object" && parsed !== null
            ? { ...parsed, ...extras }
            : { message: error.message, ...extras };
      } catch {
        response = { message: error.message, ...extras };
      }
    } else {
      const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : error;
      const causeMessage = cause instanceof Error ? cause.message : undefined;
      const message =
        causeMessage ?? (error instanceof Error ? error.message : "Internal server error");
      response = { message };
      console.error({
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        cause,
      });
    }

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };
  },
});
