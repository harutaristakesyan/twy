# packages/functions — `@twy/functions`

Every Lambda handler in the project, plus the Lambda-runtime middleware they share. Replaces the old `apps/auth/`, `apps/functions/`, and `packages/lambda-shared/` packages — those are gone.

> Read root `CLAUDE.md` first. This file is the functions-specific delta.

## Layout

```
packages/functions/
├── src/
│   ├── api/                                     # HTTP handlers (API Gateway routes)
│   │   ├── auth/                                # Public Cognito flows (signup, login, verify, …)
│   │   ├── user/   {get,list,update,self-update,delete}.ts
│   │   ├── branch/ {list,create,update,delete}.ts
│   │   ├── load/   {create,list,update,changeStatus,delete}.ts
│   │   └── file/   {upload,download,delete}.ts  # presigned-URL endpoints
│   ├── events/                                  # Non-HTTP Lambda triggers
│   │   └── postConfirmation.ts                  # Cognito post-confirmation (wired in infra/auth.ts)
│   ├── shared/                                  # Lambda-runtime middleware & helpers
│   │   ├── errors.ts lambda.ts index.ts
│   │   └── middy/{addAwsRequestId,httpJwtExtractor,httpZodHandler,jsonErrorHandler}.ts
│   ├── contracts/<domain>/{request,response}.ts # Zod schemas + TS types (move to @twy/core in a later pass)
│   ├── libs/s3/                                 # Presigned-URL helpers (move to @twy/core)
│   └── utils/                                   # Misc utilities (move to @twy/core)
├── docs/<domain>-api.md                         # API documentation
├── package.json
├── tsconfig.{json,paths}.json
└── CLAUDE.md
```

`tsconfig.paths.json` keeps four aliases pointing inside this package: `@contracts/*`, `@libs/*`, `@utils/*`, `@shared/*`. Source files use them; esbuild (via SST) honors them at bundle time.

## Routing — where each handler is wired

Every HTTP handler is named in `infra/routes.ts`:
- `authRoutes` (public, no JWT) → handlers under `src/api/auth/`.
- `appRoutes` (JWT-required) → handlers under `src/api/{user,branch,load,file}/`.

The Cognito post-confirmation trigger is wired separately in `infra/auth.ts` at `Resource.UserPool` → triggers → postConfirmation → `packages/functions/src/events/postConfirmation.handler`.

## Authoring a handler

Use `/new-handler <METHOD> <PATH>` or the `lambda-handler-author` subagent. Shape:

1. Add the Zod schema to `src/contracts/<domain>/request.ts`.
2. Add the response type to `src/contracts/<domain>/response.ts`.
3. Write the handler in `src/api/<domain>/<verb>.ts` (or `src/api/auth/` for Cognito flows). Wrap with `middyfy` from `@shared/index`. Read configuration from `Resource.X` — never `process.env`.
4. Append a `RouteDef` to `infra/routes.ts` (`authRoutes` for public Cognito flows, `appRoutes` for JWT-protected) with `linkKeys` listing the resources the handler needs.
5. If the handler needs a new DB query, add it to `packages/db/src/operations/<domain>Operations.ts` and re-export it via `packages/db/src/index.ts`. Handlers import the operation from `@twy/db`, not raw Drizzle.

```typescript
import { type GetUserEvent, GetUserEventSchema } from "@contracts/user/request";
import type { UserResponse } from "@contracts/user/response";
import { getFullUserInfoById } from "@twy/db";
import { middyfy } from "@shared/index";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

const getUserInfo = async (event: GetUserEvent): Promise<UserResponse> => {
  const { userId } = event.requestContext.authUser;
  return await getFullUserInfoById(userId);
};

export const handler = middyfy<GetUserEvent, UserResponse, APIGatewayProxyEventV2WithJWTAuthorizer>(
  getUserInfo,
  { eventSchema: GetUserEventSchema, mode: "parse" },
);
```

## Authorization

Every domain handler MUST scope its queries by `event.requestContext.authUser.userId`. Aurora has no row-level security wired up — multi-tenant isolation is the application's job. The `security-auditor` subagent checks this on every PR review.

## Cognito error mapping (auth handlers)

The Cognito SDK throws SDK-specific exceptions. Always narrow with `toError(err)` then map to `http-errors`:

| Cognito exception | http-errors |
|---|---|
| `NotAuthorizedException` | `errors.Unauthorized` (401) |
| `UserNotConfirmedException` | `errors.Forbidden` (403) "verify email first" |
| `UsernameExistsException` | `errors.Conflict` (409) |
| `CodeMismatchException` | `errors.BadRequest` (400) |
| `ExpiredCodeException` | `errors.BadRequest` (400) |
| `InvalidParameterException` | `errors.BadRequest` (400) |
| `LimitExceededException` | `errors.TooManyRequests` (429) |

Never return raw Cognito error messages to the client — they leak internal info.

## `@shared/index` — public surface

```typescript
export { toError } from "./errors.js";
export { type MiddyOptions, middyfy, wrapHandler } from "./lambda.js";
export { addAwsRequestId } from "./middy/addAwsRequestId.js";
export { httpJwtExtractor } from "./middy/httpJwtExtractor.js";
export {
  type HttpZodHandlerMode,
  type HttpZodHandlerOptions,
  httpZodHandler,
} from "./middy/httpZodHandler.js";
export { jsonErrorHandler } from "./middy/jsonErrorHandler.js";
```

`middyfy` is the composed Middy stack (jsonErrorHandler → middyJsonBodyParser → httpJwtExtractor → addAwsRequestId → optional httpZodHandler → handler). `mode: "parse"` *replaces* `event` with the parsed shape; `mode: "validate"` only checks. Mismatching `mode` and the typed handler parameter is a silent bug source.

## Resource SDK reads

| Resource | Provided by | Used for |
|---|---|---|
| `Resource.Cluster.{clusterArn,secretArn,database}` | `infra/database.ts` (`db.cluster`) | Consumed by `@twy/db`; handlers never read directly |
| `Resource.UserPoolClient.id` | `infra/auth.ts` | Public Cognito flows in `src/api/auth/*` |
| `Resource.UserPool.id` | `infra/auth.ts` | Admin user ops in `src/api/user/*` |
| `Resource.Files.name` | `infra/storage.ts` | S3 PUT/GET/DELETE presigned URLs in `libs/s3/fileStorage.ts` |

The route-side `linkKeys: ["cluster", ...]` in `infra/routes.ts` is what grants the handler the IAM permissions and Resource bindings.

## Errors

Throw `http-errors` instances. The `jsonErrorHandler` middleware (auto-added by `middyfy`) converts them to JSON responses. Don't return `{ statusCode: 500 }` manually.

```typescript
import errors from "http-errors";

if (!user) throw new errors.NotFound(`user ${id} not found`);
if (user.role !== "admin") throw new errors.Forbidden("admin only");
```

## Build & test

```bash
pnpm --filter @twy/functions build
pnpm --filter @twy/functions exec vitest run path/to/file.test.ts
```

Turbo's `^build` ensures `@twy/db` is built first.

## Deploy

```bash
pnpm sst deploy --stage dev
```

CI runs `sst deploy` first, then the `@twy/db` migration step in the same job. There is no per-app deploy script.
