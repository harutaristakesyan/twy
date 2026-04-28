---
name: lambda-handler
description: Use when authoring or modifying a Lambda HTTP handler under apps/auth/src/functions/ or apps/functions/src/functions/. Covers the exact middyfy/Zod/HttpLambdaRouter pattern enforced by the codebase, the requireAuth contract, error throwing conventions, and how the response shape gets wrapped by middleware.
---

# Authoring a twy Lambda HTTP handler

## When this skill applies

- Adding a new HTTP endpoint to `@twy/auth` or `@twy/functions`.
- Modifying an existing handler's request/response shape.
- Diagnosing why a handler returns 502 or the wrong content-type.

## Required imports

```typescript
import { middyfy } from "@twy/lambda-shared";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import errors from "http-errors";          // for thrown HTTP errors
import * as zod from "zod";                // for the contract
```

## The shape

```typescript
// 1. Define the contract (in apps/<app>/src/contracts/<domain>/request.ts for functions, inline for auth)
const EventSchema = zod.object({
  body: zod.object({ ... }),
  pathParameters: zod.object({ id: zod.uuid() }).optional(),
  queryStringParameters: zod.object({ ... }).optional(),
  requestContext: zod.object({
    authUser: zod.object({ userId: zod.uuid() }),
  }),
});
type EventSchema = zod.infer<typeof EventSchema>;

// 2. Define the response type
interface XResponse { ... }

// 3. Write the inner handler (pure — no Lambda envelope)
const xHandler = async (event: EventSchema): Promise<XResponse> => {
  const { userId } = event.requestContext.authUser;
  // business logic
  return { ... };
};

// 4. Export the wrapped handler
export const handler = middyfy<EventSchema, XResponse, APIGatewayProxyEventV2WithJWTAuthorizer>(
  xHandler,
  {
    eventSchema: EventSchema,
    mode: "parse",       // replaces event with parsed shape; "validate" only checks
  },
);
```

## Middleware order (provided by `middyfy`)

```
jsonErrorHandler → middyJsonBodyParser → httpJwtExtractor → addAwsRequestId → optional httpZodHandler → handler
```

What this means:
- Body is already JSON-parsed when the handler sees it.
- `event.requestContext.authUser.userId` is populated for routes wired with `requiresAuth: true` (the JWT authorizer rejects unauthed requests at API Gateway before Lambda runs).
- Throw `http-errors` instances (`new errors.NotFound(...)`, `new errors.BadRequest(...)`) — they're converted to JSON responses with the matching status.
- The handler returns a plain object/array; `serializeResponse` wraps it in `{ statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(...) }`.
- `addAwsRequestId` further wraps responses to `{ data, requestId }` for correlation.

## Route wiring

In `apps/<app>/bin/functionStack.ts`:

```typescript
{
  functionPath: "src/functions/<domain>/<verb>.ts",
  routeKey: "GET /<domain>/{id}",
  requiresAuth: true,
  // env: { EXTRA: "..." } only if needed
}
```

## Common mistakes

- **Reading `event.body` as a string** — it's already parsed. Type the EventSchema.body as the parsed shape.
- **Forgetting `mode: "parse"`** — without it, the typed parameter is a lie at runtime.
- **Using `JSON.stringify` in the handler return** — `serializeResponse` does it; double-stringification breaks parsing on the client.
- **Setting CORS headers manually** — API Gateway handles CORS at the route level.
- **Catching errors and returning `{ statusCode: 500 }` manually** — let `jsonErrorHandler` do it. If you catch, narrow with `toError(err)`, log, and rethrow as an `http-errors` instance.

## Testing

Co-located `<verb>.test.ts`. Import the inner function (export it explicitly: `export const xHandler = ...`). Mock AWS SDK clients. Build the event from the EventSchema.
