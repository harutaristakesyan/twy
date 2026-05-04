import type { MiddlewareObj } from "@middy/core";
import type { APIGatewayProxyResult } from "aws-lambda";
import { isHttpError } from "http-errors";

export const jsonErrorHandler = (): MiddlewareObj => ({
  onError: async (request): Promise<APIGatewayProxyResult> => {
    const { error } = request;

    let statusCode = 500;
    let message = "Internal server error";
    let response: Record<string, unknown> = {};

    if (isHttpError(error)) {
      statusCode = error.statusCode ?? 400;

      // Try parsing message in case it's a JSON string
      try {
        const parsed = JSON.parse(error.message);
        response = typeof parsed === "object" ? parsed : { message: error.message };
      } catch {
        response = { message: error.message };
      }
    } else {
      if (error instanceof Error) {
        message = error.message;
        response = { message };
      }
      console.error({
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? (error as Error & { cause?: unknown }).cause : error,
      });
    }

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  },
});
