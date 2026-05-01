/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Cognito user pool + app client + post-confirmation Lambda — replacement
 * for apps/infra/bin/stacks/auth-stack.ts.
 *
 * Sign-in alias: email. Self-sign-up enabled. The post-confirmation trigger
 * gets `link: [db]` so it can write a row into the users table on first
 * verification (replaces the manual `dsql:DbConnectAdmin` policy attached
 * via dsqlConnectPolicyFor in the CDK era).
 */
export function createAuth(args: { db: { cluster: sst.aws.Dsql } }) {
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
      },
    },
    triggers: {
      postConfirmation: {
        handler: "apps/functions/src/functions/postConfirmation.handler",
        link: [args.db.cluster],
        permissions: [
          {
            actions: ["cognito-idp:AdminDisableUser"],
            resources: ["*"],
          },
        ],
      },
    },
  });

  const userPoolClient = userPool.addClient("Web", {
    transform: {
      client: {
        explicitAuthFlows: [
          "ALLOW_USER_PASSWORD_AUTH",
          "ALLOW_USER_SRP_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH",
        ],
        generateSecret: false,
      },
    },
  });

  return { userPool, userPoolClient };
}
