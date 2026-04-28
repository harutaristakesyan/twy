# apps/auth — `@twy/auth`

Cognito user pool + auth Lambdas (sign up, verify, login, refresh, forgot-password, confirm-forgot-password, resend-verification-code). Wired into the shared HttpApi via `bin/functionStack.ts` using the `HttpLambdaRouter` construct.

> Read root `CLAUDE.md` first. This file is the auth-app-specific delta.

## Handlers

All under `src/functions/`:

| File | Route | Auth |
|---|---|---|
| `signUp.ts` | `POST /auth/signup` | public |
| `verify.ts` | `POST /auth/verify` | public |
| `login.ts` | `POST /auth/login` | public |
| `refreshToken.ts` | `POST /auth/refresh` | public |
| `forgotPassword.ts` | `POST /auth/forgot-password` | public |
| `confirmForgotPassword.ts` | `POST /auth/confirm-forgot-password` | public |
| `resendVerificationCode.ts` | `POST /auth/resend-verification-code` | public |

Every other handler that authenticates a user must live in `apps/functions`, not here. This package is for Cognito flows specifically.

## Pattern

Every handler uses `middyfy` from `@twy/lambda-shared`. Example:

```typescript
import { middyfy, requireEnv, toError } from "@twy/lambda-shared";
import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import errors from "http-errors";
import * as zod from "zod";

const EventSchema = zod.object({
  body: zod.object({ email: zod.email(), password: zod.string().min(8) }),
});
type EventSchema = zod.infer<typeof EventSchema>;

interface LoginResponse { accessToken: string; idToken: string; refreshToken: string; }

const cognito = new CognitoIdentityProviderClient({});
const CLIENT_ID = requireEnv("COGNITO_CLIENT_ID");

const loginHandler = async (event: EventSchema): Promise<LoginResponse> => {
  try {
    const result = await cognito.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: event.body.email, PASSWORD: event.body.password },
    }));
    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken || !auth.IdToken || !auth.RefreshToken) {
      throw new errors.Unauthorized("Login failed");
    }
    return { accessToken: auth.AccessToken, idToken: auth.IdToken, refreshToken: auth.RefreshToken };
  } catch (err) {
    const e = toError(err);
    if (e.name === "NotAuthorizedException") throw new errors.Unauthorized("Bad credentials");
    if (e.name === "UserNotConfirmedException") throw new errors.Forbidden("Email not verified");
    throw e;
  }
};

export const handler = middyfy<EventSchema, LoginResponse>(loginHandler, {
  eventSchema: EventSchema,
  mode: "parse",
});
```

Use the `lambda-handler-author` subagent (or the `/new-handler` command) for new handlers — it codifies this exact shape.

## Cognito client config

Read from env vars set by the CDK stack:

- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- (optional) `COGNITO_REGION` — defaults to `AWS_REGION`.

Always read with `requireEnv("X")`, not `process.env.X!`. The pre-tool-use hook + `noNonNullAssertion` rule + the requireEnv migration commit (`e8fb4b4`) all push this direction.

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

```bash
ENV=dev pnpm --filter @twy/auth synth
ENV=dev pnpm --filter @twy/auth diff
ENV=dev pnpm --filter @twy/auth deploy
```

CI runs deploy-auth after deploy-infra (the user pool is created by `apps/infra/bin/stacks/auth-stack.ts`; this app attaches Lambdas to it).
