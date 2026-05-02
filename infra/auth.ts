/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Cognito user pool + app client + post-confirmation Lambda.
 *
 * Sign-in alias: email. Self-sign-up enabled. The post-confirmation trigger
 * gets `link: [db.cluster]` so it can write a row into the users table on
 * first verification — IAM grants for the RDS Data API + Secrets Manager
 * read are auto-derived from the link.
 */
export function createAuth(args: { db: { cluster: sst.aws.Aurora } }) {
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
        handler: "packages/functions/src/events/postConfirmation.handler",
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

  const userPoolClient = userPool.addClient("UserPoolClient", {
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
