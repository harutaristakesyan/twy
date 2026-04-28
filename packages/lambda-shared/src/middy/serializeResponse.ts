/*
 * Copyright © 2025 EPAM Systems, Inc. All Rights Reserved. All information contained herein is, and remains the
 * property of EPAM Systems, Inc. and/or its suppliers and is protected by international intellectual
 * property law. Dissemination of this information or reproduction of this material is strictly forbidden,
 * unless prior written permission is obtained from EPAM Systems, Inc
 */
import type middy from "@middy/core";

interface LambdaHandlerResponse {
  body: object | string;
  statusCode: number;
}

interface JsonResponse {
  statusCode: number;
  body: string;
  headers: {
    "Content-Type": "application/json";
  };
}

export const generateJSONResponse = (body: object | string): JsonResponse => {
  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

export const serializeResponse = (): middy.MiddlewareObj => {
  return {
    after: (request: middy.Request<unknown, LambdaHandlerResponse>): void => {
      if (request.response) {
        request.response = generateJSONResponse(request.response);
      }
    },
  };
};
