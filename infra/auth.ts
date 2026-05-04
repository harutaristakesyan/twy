/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Cognito user pool + app client + Cognito trigger Lambdas.
 *
 * Triggers are wired manually (not via SST shorthand) so we can:
 *  - Use the V2_0 PreTokenGeneration event to add `app_user_id` to access
 *    and ID tokens (requires Essentials tier).
 *  - Keep full control over lambdaConfig without fighting SST's V1_0 default.
 *
 * The postConfirmation Lambda generates a crypto.randomUUID() as the DB
 * primary key and stores the Cognito sub as `cognitoSub`. It also writes
 * `custom:appUserId` back to Cognito so the PreTokenGen trigger can emit it.
 */
export function createAuth(args: {
  db: { cluster: sst.aws.Aurora };
  filesBucket: sst.aws.Bucket;
  authContextTable: sst.aws.Dynamo;
}) {
  const postConfirmationFn = new sst.aws.Function("PostConfirmation", {
    handler: "packages/functions/src/events/postConfirmation.handler",
    link: [args.db.cluster, args.filesBucket, args.authContextTable],
    permissions: [
      {
        actions: [
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser",
        ],
        resources: ["*"],
      },
    ],
  });

  const preTokenGenerationFn = new sst.aws.Function("PreTokenGenerationV2", {
    handler: "packages/functions/src/events/preTokenGenerationV2.handler",
  });

  const userPool = new sst.aws.CognitoUserPool("UserPool", {
    usernames: ["email"],
    transform: {
      userPool: {
        autoVerifiedAttributes: ["email"],
        accountRecoverySetting: {
          recoveryMechanisms: [{ name: "verified_email", priority: 1 }],
        },
        passwordPolicy: {
          minimumLength: 8,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
          requireUppercase: false,
        },
        adminCreateUserConfig: { allowAdminCreateUserOnly: false },
        userPoolTier: "ESSENTIALS",
        schemas: [
          {
            name: "appUserId",
            attributeDataType: "String",
            mutable: true,
            required: false,
          },
        ],
        lambdaConfig: {
          postConfirmation: postConfirmationFn.arn,
          preTokenGenerationConfig: {
            lambdaArn: preTokenGenerationFn.arn,
            lambdaVersion: "V2_0",
          },
        },
      },
    },
  });

  new aws.lambda.Permission("PostConfirmationCognitoPermission", {
    action: "lambda:InvokeFunction",
    function: postConfirmationFn.arn,
    principal: "cognito-idp.amazonaws.com",
    sourceArn: userPool.arn,
  });

  new aws.lambda.Permission("PreTokenGenerationCognitoPermission", {
    action: "lambda:InvokeFunction",
    function: preTokenGenerationFn.arn,
    principal: "cognito-idp.amazonaws.com",
    sourceArn: userPool.arn,
  });

  const userPoolClient = userPool.addClient("UserPoolClient", {
    transform: {
      client: {
        explicitAuthFlows: [
          "ALLOW_USER_PASSWORD_AUTH",
          "ALLOW_USER_SRP_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH",
        ],
        generateSecret: false,
        writeAttributes: ["email", "given_name", "family_name"],
        // custom:appUserId is intentionally excluded — only postConfirmation Lambda sets it via AdminUpdateUserAttributes
        readAttributes: ["email", "given_name", "family_name", "custom:appUserId"],
      },
    },
  });

  return { userPool, userPoolClient };
}
