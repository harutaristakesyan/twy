import { APIGatewayProxyResult } from "aws-lambda";
import { MiddlewareObj } from "@middy/core";
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
        response =
          typeof parsed === "object" ? parsed : { message: error.message };
      } catch {
        response = { message: error.message };
      }
    } else if (error instanceof Error) {
      // Optional fallback for unexpected errors
      message = error.message;
      response = { message };
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
