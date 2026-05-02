import type middy from "@middy/core";

export const addAwsRequestId = (): middy.MiddlewareObj => ({
  after: (request): void => {
    wrapResponseWithRequestId(request);
  },
  onError: (request): void => {
    wrapResponseWithRequestId(request);
  },
});

function wrapResponseWithRequestId(request: middy.Request): void {
  const { response, context } = request;

  if (!response) return;

  if (typeof response.body === "string") {
    try {
      const originalBody = JSON.parse(response.body);
      response.body = JSON.stringify({
        data: originalBody,
        requestId: context.awsRequestId,
      });
    } catch {
      // Ignore if not valid JSON
    }
  } else if (typeof response === "object") {
    // If it's a plain object, wrap and replace the whole response
    request.response = {
      statusCode: 200,
      body: JSON.stringify({
        data: response,
        requestId: context.awsRequestId,
      }),
      headers: { "Content-Type": "application/json" },
    };
  }
}
