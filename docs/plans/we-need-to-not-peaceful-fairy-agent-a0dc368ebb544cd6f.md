# Research: Decoupling app user id from Cognito `sub` via custom attribute + PreTokenGen

Scope: SST v3 + `sst.aws.CognitoUserPool` + API Gateway HTTP API JWT authorizer. Today the handler reads `event.requestContext.authorizer.jwt.claims.sub` (already a UUID v4). Proposal: mint our own UUID, store on Cognito as `custom:appUserId`, surface via Pre Token Generation, read that instead.

---

## A. Is this a recognized pattern? Yes — typical motivations

The "don't use `sub` as your app primary key" recommendation is well-established. AWS-adjacent and AWS-documented motivations:

1. **User-pool migration is a realistic event and `sub` does not survive it.** Importing users to a new pool re-issues `sub`. Federated users' custom attributes are not exported and they receive a new `sub` on first sign-in to the new pool. Many pool settings (alias attribute mutability, region, account boundary, MFA seeds) are immutable on a created pool, so migration is the only fix. ([Cloudar — Options for migrating between Cognito User Pools](https://cloudar.be/awsblog/options-for-migrating-between-amazon-cognito-user-pools/), [AWS Security Blog — Approaches for migrating users to Cognito](https://aws.amazon.com/blogs/security/approaches-for-migrating-users-to-amazon-cognito-user-pools/))
2. **Multi-IdP federation changes the meaning of `sub`.** Cognito generates its own `sub` (UUID) per profile; the IdP's own `sub` lives in `identities[]`. One human can become multiple Cognito profiles (e.g., `Google_117…`, `Microsoft_b8e…`) unless you implement linking via `AdminLinkProviderForUser` from a Pre Sign-up trigger. ([Cognito — Linking federated users](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html), [Cognito — Mapping IdP attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html))
3. **Single canonical id format / IdP independence.** Treat Cognito as an authentication artifact; keep the domain identity owned by your DB. Re-platforming the IdP later (Auth0, WorkOS, Clerk, raw OIDC) becomes additive rather than a wholesale FK rewrite.

Verdict: Yes, recognized. The decoupling itself is best-practice; whether the right *carrier* is `custom:appUserId` vs. an `external_id` column is a separate question (see D).

---

## B. Pre Token Generation specifics for HTTP API JWT authorizer

### B1. Can PreTokenGen add custom claims to the **access token**?

Yes, since Dec 2023, via the **V2_0** trigger event (or **V3_0** for M2M client-credentials). The default V1_0 event only mutates the ID token; V2_0/V3_0 expose `response.claimsAndScopeOverrideDetails.accessTokenGeneration.claimsToAddOrOverride`. ([Cognito — Pre token generation Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html), [AWS Security Blog — How to customize access tokens](https://aws.amazon.com/blogs/security/how-to-customize-access-tokens-in-amazon-cognito-user-pools/), [re:Post — Cognito finally supports custom claims for access tokens](https://repost.aws/articles/ARlRBV5B86TzmrD6TJvMuHpQ/aws-cognito-finally-supports-custom-claims-for-access-tokens))

Constraints worth flagging:
- **Feature tier required.** V2_0 needs Essentials/Plus tier (or Lite + advanced security). V3_0 (M2M) is Essentials/Plus only.
- **Reserved claims.** Cannot override `sub`, `iss`, `aud`. Cognito silently drops attempts. This means you cannot "replace" `sub` in place — you must add a new claim name.
- **10,000-character total claim payload limit.**
- **Configured via `LambdaVersion: V2_0`** in `PreTokenGenerationConfig`, not just by attaching a function.

### B2. Which token does the HTTP API JWT authorizer validate, and what lands in `jwt.claims`?

The HTTP API JWT authorizer validates **whatever JWT the client sends in the `identitySource` header** — there's no automatic preference for ID vs. access. AWS docs explicitly note "there is no standard mechanism to differentiate JWT access tokens from other types of JWTs, such as OpenID Connect ID tokens." ([API Gateway — JWT authorizers for HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html))

In practice (and what SST configures): clients send the **access token** as `Bearer …`. Reasons:
- Scopes (if you use them) only exist on the access token.
- `aud` validation on the authorizer matches `aud` if present, else `client_id` — Cognito access tokens carry `client_id`, ID tokens carry `aud`. SST's `auth.jwt.audience` setup expects access tokens.
- AWS Amplify and most SDK examples send the access token.

Whichever token arrives, **its claims** populate `event.requestContext.authorizer.jwt.claims`. Default Cognito access-token claims are minimal (`sub`, `username`, `client_id`, `scope`, `auth_time`, `iss`, `iat`, `exp`, `jti`, `origin_jti`, `token_use: "access"`, plus `cognito:groups` if present). **Custom user-pool attributes are NOT in the access token by default.** ([Cognito — Understanding the access token](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html), [re:Post — Lambda not receiving claims from API Gateway Cognito Authorizer](https://repost.aws/questions/QUjtk7244cQaatpTSG6NyM-g/lambda-not-receiving-claims-from-api-gateway-cognito-authorizer))

So: you **must** use a V2_0 PreTokenGen trigger to inject `custom:appUserId` into the access-token claims. A V1_0 trigger only buys you the ID token, which the HTTP API authorizer (as configured by SST) does not see.

### B3. `custom:` prefix pass-through

Yes — the prefix is preserved end-to-end. API Gateway HTTP API forwards claims verbatim into `event.requestContext.authorizer.jwt.claims["custom:appUserId"]` (bracket access, since `:` is illegal in dot-path). Two known sharp edges:

- **REST API parameter mapping** (i.e., `$context.authorizer.claims['custom:foo']` in mapping templates / VTL) historically had bracket-syntax bugs ([aws-cdk #22010](https://github.com/aws/aws-cdk/issues/22010)). Not relevant for HTTP API + Lambda integration — Lambda receives the JSON object intact.
- **Promotion to a top-level claim name.** If you'd prefer to read `claims.appUserId` (no `custom:`), the V2 trigger lets you write any claim name into `claimsToAddOrOverride`, including names without the prefix. So you can either pass through the raw `custom:appUserId` or emit it as `app_user_id` at token-mint time. The latter is cleaner for downstream code.

---

## C. Custom attribute setup in CloudFormation / SST

Cognito custom attributes are declared in the user pool `Schema`. Important properties on `SchemaAttribute`: ([CloudFormation — UserPool SchemaAttribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-schemaattribute.html), [Cognito — Working with user attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html))

| Field | Recommended for `appUserId` | Note |
|---|---|---|
| `Name` | `appUserId` | Cognito prepends `custom:` automatically. Max 20 chars. |
| `AttributeDataType` | `String` | UUIDs are strings. |
| `Mutable` | `true` | False is permanent — you can never repair a wrong value. Mutable still respects WriteAttributes. |
| `Required` | `false` | Required custom attributes can't exist; only standard attributes can be required. |
| `StringAttributeConstraints` | `MinLength: "36", MaxLength: "36"` | Optional UUID-shape guard. |
| `DeveloperOnlyAttribute` | omit | Legacy, deprecated in favor of WriteAttributes pattern. |

**Critical hardening:** the user can self-mutate any attribute that appears in the app client's `WriteAttributes`. Default is *all attributes writable*. To make `custom:appUserId` admin-only:
- Schema: `Mutable: true`
- App client: explicitly set `WriteAttributes` to a list that **omits** `custom:appUserId` (and probably also omits other server-managed fields like roles/billing).
- App client: include `custom:appUserId` in `ReadAttributes` only if you want clients to read it back via `GetUser` (the JWT path doesn't need this).

Without this, a user can call `UpdateUserAttributes` with their own access token and reassign their app id — catastrophic.

**SST surface area.** `sst.aws.CognitoUserPool` triggers documented today ([SST — CognitoUserPool](https://sst.dev/docs/component/aws/cognito-user-pool)) cover `preSignUp`, `preAuthentication`, `postAuthentication`, `postConfirmation`, `customEmailSender`, `customSmsSender`, plus a documented `preTokenGeneration` (Context7 returned its description, see "User Pool Triggers > preTokenGeneration?" entry). For the **V2_0 event version + Schema + WriteAttributes** there is no first-class arg in the SST component today — apply via the `transform.userPool` escape hatch on the underlying Pulumi `aws.cognito.UserPool`/`UserPoolClient` to set `schemas[]`, `writeAttributes`, and `preTokenGenerationConfig.lambdaVersion: "V2_0"`. Plain `triggers.preTokenGeneration: "src/handler.handler"` will default to V1_0 and won't customize the access token.

---

## D. Alternatives (mention only)

- **Keep using `sub`.** It's already a UUID v4, generated by Cognito, in every token by default, with zero custom infra. The "win" of switching is purely future-proofing against pool migration / IdP change. If neither is on the roadmap, the cost (extra Lambda cold start in the auth path, V2_0 tier requirement, schema lock-in, hardening surface) may outweigh the benefit.
- **Hybrid: app-issued UUID PK in DB, separate `cognito_sub` column, JWT still keyed by `sub`.** Keeps the auth path stock; decoupling lives in the persistence layer. On migration you only update the `cognito_sub` column. This is the most common production pattern and avoids touching tokens.

---

## E. Migration plan if you already have rows keyed by `sub`

Standard additive backfill (matches the `drizzle-migration` skill's pattern):

1. **Add `external_id uuid` column**, nullable, unique. Do not drop `sub` yet.
2. **Backfill** — two flavors:
   - *Conservative*: `UPDATE users SET external_id = id` (i.e., reuse the existing `sub` value as the new external id). Keeps existing tokens valid until you're ready to switch the read path.
   - *Aggressive*: generate fresh `gen_random_uuid()` for each row. Requires you to also write the new value back to Cognito as `custom:appUserId` for every existing user (admin-update loop), and your auth middleware must tolerate both old and new for a deprecation window.
3. **Promote** `external_id` to `NOT NULL`, then to PK (or keep as a unique alternate key, swap PK in a follow-up migration).
4. **Update FKs** referencing `users.id`. With Drizzle this is a fan-out of additive migrations; each FK gets a new column, backfill, swap.
5. **Cut over readers**: middleware reads `claims["custom:appUserId"]` (or the promoted `app_user_id`), with a fallback to `claims.sub` for tokens minted before the trigger was deployed. Remove fallback after refresh-token TTL has fully cycled.
6. **Cognito side**: deploy schema + V2_0 trigger first, then run a one-time admin script that calls `AdminUpdateUserAttributes` for each user with the value chosen in step 2.

Order matters: Cognito attributes first (so new logins start carrying the claim), then DB column + backfill, then read-path swap, then drop `sub` reads.

---

## Concrete next-step decisions to confirm before implementing

1. **Conservative vs aggressive backfill** (D's two flavors) — does existing `users.id` value get preserved as the new `appUserId`, or do we mint fresh UUIDs?
2. **Feature tier** — is the user pool already on Essentials/Plus? V2_0 PreTokenGen requires it.
3. **Claim name on the wire** — `custom:appUserId` (raw, with prefix) or promoted to `app_user_id` (no prefix) inside the trigger? Recommend the latter for cleaner middleware.
4. **WriteAttributes audit** — are we ready to enumerate the full client-writable attribute list, or is this the first time we'll touch it? If first time, expect to discover other attributes that should also be locked down.
5. **Per-origin tokens** — `twy.am` vs `twy.be` use separate `localStorage` (per CLAUDE.md). The migration must run once per pool; since both domains share one pool, that's fine, but the dual-login UX edge case still exists.

---

## Sources

- [API Gateway — JWT authorizers for HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [Cognito — Pre token generation Lambda trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html)
- [AWS Security Blog — How to customize access tokens in Cognito user pools](https://aws.amazon.com/blogs/security/how-to-customize-access-tokens-in-amazon-cognito-user-pools/)
- [AWS Security Blog — Use Cognito to add claims to an identity token for fine-grained authorization](https://aws.amazon.com/blogs/security/use-amazon-cognito-to-add-claims-to-an-identity-token-for-fine-grained-authorization/)
- [AWS Security Blog — Approaches for migrating users to Cognito user pools](https://aws.amazon.com/blogs/security/approaches-for-migrating-users-to-amazon-cognito-user-pools/)
- [Cognito — Understanding the access token](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html)
- [Cognito — Working with user attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html)
- [Cognito — Linking federated users to an existing user profile](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html)
- [Cognito — Mapping IdP attributes to profiles and tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html)
- [CloudFormation — AWS::Cognito::UserPool SchemaAttribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-schemaattribute.html)
- [Cloudar — Options for migrating between Cognito User Pools](https://cloudar.be/awsblog/options-for-migrating-between-amazon-cognito-user-pools/)
- [re:Post — Cognito finally supports custom claims for access tokens](https://repost.aws/articles/ARlRBV5B86TzmrD6TJvMuHpQ/aws-cognito-finally-supports-custom-claims-for-access-tokens)
- [re:Post — Lambda not receiving claims from API Gateway Cognito Authorizer](https://repost.aws/questions/QUjtk7244cQaatpTSG6NyM-g/lambda-not-receiving-claims-from-api-gateway-cognito-authorizer)
- [re:Post — Do Cognito custom attributes added by PreTokenGen show in GetUser?](https://repost.aws/questions/QUgl-VFeRmTHmgbs0xS5Yu3A/do-cognito-custom-attributes-added-by-your-pre-token-generation-lambda-show-up-in-getuser)
- [aws-cdk #22010 — parameterMapping bracket syntax for `custom:` claims](https://github.com/aws/aws-cdk/issues/22010)
- [SST — CognitoUserPool component](https://sst.dev/docs/component/aws/cognito-user-pool)
