# packages/lambda-shared — `@twy/lambda-shared`

ESM-only package providing the Middy middleware stack and helper utilities used by every Lambda handler in `@twy/auth` and `@twy/functions`.

> This package is at the bottom of the dependency graph. It must be built before any consumer can be bundled. Turbo's `dependsOn: ["^build"]` handles this automatically when you run from the root; a bare `cdk deploy` inside a Lambda app without first building this package will fail.

## Public surface (from `src/index.ts`)

```typescript
export { requireEnv } from "./env.js";
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
export { generateJSONResponse, serializeResponse } from "./middy/serializeResponse.js";
```

### `requireEnv(name: string): string`
Throws if the env var is missing or empty. **Use this instead of `process.env.X!`** — non-null assertions on env vars are forbidden by the codebase's drift back into `noNonNullAssertion` violations (commit `e8fb4b4`).

### `toError(err: unknown): Error`
Narrows `unknown` from a `catch` block into `Error`. Use it as the first line of every catch:
```typescript
try { ... } catch (err) {
  const e = toError(err);
  // e.name, e.message safely accessible
}
```

### `middyfy<TEvent, TResult, TOriginalEvent, TContext>(handler, options?)`
Composed Middy stack. Options:
```typescript
{
  eventSchema?: ZodType,
  mode?: "validate" | "parse",       // default "validate"
  timeoutEarlyInMillis?: number,
}
```

Middleware order (auto-applied):
```
jsonErrorHandler → middyJsonBodyParser → httpJwtExtractor → addAwsRequestId → optional httpZodHandler → handler
```

`mode: "parse"` *replaces* `event` with the parsed shape. `mode: "validate"` only checks. Mismatching `mode` and your typed handler parameter is a silent bug source.

### `httpJwtExtractor()`
Reads `event.requestContext.authorizer.jwt.claims`, populates `event.requestContext.authUser = { userId }`. Requires the route to be wired with `requiresAuth: true` in the CDK route definition (which attaches the JWT authorizer at API Gateway).

### `httpZodHandler({ eventSchema, mode })`
Validates `event` against the Zod schema. ZodError → 400 BadRequest. With `mode: "parse"` the parsed value replaces `event`.

### `jsonErrorHandler()`
Catches errors. `http-errors` instances → `{ statusCode, body: { message } }`. Unknown errors → 500. Logs the original.

### `addAwsRequestId()`
Wraps the response in `{ data, requestId }` for client-side correlation.

### `serializeResponse()`
Converts the handler's plain-object return value into the API Gateway response envelope: `{ statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(...) }`.

### `generateJSONResponse(body)`
Standalone helper for when you need to build a response outside the middleware stack (rare).

## Conventions for additions to this package

- This package is `"type": "module"` and exports via `dist/`. Any new file must be added to the `exports` map in `package.json` if it should be reachable from consumers.
- Don't import from `dist/` — write source TypeScript and let Turbo build.
- Don't add dependencies that aren't ESM-compatible. CommonJS-only packages will break ESM consumers (the Lambda bundles use `format: "esm"`).
- Don't add an env-reading helper that doesn't fail loudly. The whole point of `requireEnv` is to fail fast at boot, not silently return `undefined`.

## Build

```bash
pnpm --filter @twy/lambda-shared build       # tsc → dist/
```

CI runs this automatically as part of the build job before any Lambda app is bundled.

## Testing

This package has no tests yet. New helpers should ship with co-located `<file>.test.ts` using Vitest. Mock nothing — these are pure utilities.

## Pitfall

If a Lambda app reports `Cannot find module "@twy/lambda-shared"` during `cdk deploy`:
```bash
pnpm --filter @twy/lambda-shared build
```
Then retry. Turbo handles this from root, but a bare `cdk deploy` inside a single app does not.
