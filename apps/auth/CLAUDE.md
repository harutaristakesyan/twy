# apps/auth — `@twy/auth`

Cognito flow Lambdas (sign up, verify, login, refresh, forgot-password, confirm-forgot-password, resend-verification-code). The infra (user pool, app client, post-confirmation trigger) lives in **`infra/auth.ts`** at the repo root, and the routes are wired in **`infra/routes.ts`** + **`infra/api.ts`**.

> Read root `CLAUDE.md` first. This file is the auth-app-specific delta.

## Handlers

All under `src/functions/`:

| File | Route | Auth |
|---|---|---|
| `signUp.ts` | `POST /api/signup` | public |
| `verify.ts` | `POST /api/verify` | public |
| `login.ts` | `POST /api/login` | public |
| `refreshToken.ts` | `POST /api/refresh-token` | public |
| `forgotPassword.ts` | `POST /api/forgot-password` | public |
| `confirmForgotPassword.ts` | `POST /api/create-password` | public |
| `resendVerificationCode.ts` | `POST /api/resend-code` | public |

Every other handler that authenticates a user must live in `apps/functions`, not here. This package is for Cognito flows specifically.

The post-confirmation trigger is intentionally **not** here — it lives at `apps/functions/src/functions/postConfirmation.ts` because it needs DB access to insert the user row. SST wires it as the Cognito trigger via `infra/auth.ts`.

## Pattern

Every handler uses `middyfy` from `@twy/lambda-shared`. Read configuration from the SST Resource SDK, **never** from `process.env` or `requireEnv`. Example:

```typescript
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { middyfy, toError } from "@twy/lambda-shared";
import errors from "http-errors";
import { Resource } from "sst";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({ email: zod.email(), password: zod.string().min(8) }),
});
type EventSchema = zod.infer<typeof EventSchema>;

interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

const userPoolClientId = Resource.UserPoolClient.id;
const cognitoClient = new CognitoIdentityProviderClient({});

const loginHandler = async (event: EventSchema): Promise<LoginResponse> => {
  try {
    const result = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: userPoolClientId,
        AuthParameters: { USERNAME: event.body.email, PASSWORD: event.body.password },
      }),
    );
    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
      throw new errors.Unauthorized("Login failed");
    }
    return {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      refreshToken: auth.RefreshToken,
    };
  } catch (err) {
    throw new errors.BadRequest(toError(err).message);
  }
};

export const handler = middyfy<EventSchema, LoginResponse>(loginHandler);
```

Use the `lambda-handler-author` subagent (or the `/new-handler` command) for new handlers — it codifies this exact shape.

## Resource SDK reads

| Resource | Provided by | Used for |
|---|---|---|
| `Resource.UserPoolClient.id` | `infra/auth.ts` | All sign-up / sign-in / refresh / forgot-password Cognito SDK calls |
| `Resource.UserPool.id` | `infra/auth.ts` | Admin operations (only used in `apps/functions`, not here) |

The link is wired in `infra/routes.ts` via `linkKeys: ["userPoolClient"]` per route.

## Cognito error mapping

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

## Build & test

```bash
pnpm --filter @twy/auth build
# new tests would go co-located: src/functions/login.test.ts
```

## Deploy

Deployment is owned by SST at the root. There is no `apps/auth` `synth/diff/deploy` script anymore — adding a handler means:

1. Author the handler in `src/functions/`.
2. Append a `RouteDef` to `infra/routes.ts` `authRoutes` (or `appRoutes` if it requires JWT).
3. Run `pnpm sst deploy --stage dev` (locally, against your AWS profile) or push to trigger CI.
