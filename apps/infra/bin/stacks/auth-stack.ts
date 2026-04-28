import {
  aws_iam,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { emailTemplate } from "./auth-template/email";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface AuthStackProps extends StackProps {}

export class AuthStack extends Stack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const dsqlClusterId = StringParameter.valueForStringParameter(
      this,
      "/dsql/cluster-id",
    );

    const dsql = dsqlConnectPolicyFor(this.region, this.account, dsqlClusterId);

    const postConfirmationFn = new NodejsFunction(this, "PostConfirmationFn", {
      functionName: "PostConfirmationFn",
      description: "Post confirmation function",
      entry: "src/functions/postConfirmation.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      memorySize: 512,
      logRetention: RetentionDays.THREE_DAYS,
      bundling: {
        forceDockerBundling: false,
      },
      initialPolicy: [
        dsql,
        new aws_iam.PolicyStatement({
          actions: ["cognito-idp:AdminDisableUser"],
          resources: ["*"],
        }),
      ],
    });

    const userPool = new cognito.UserPool(this, "TWYUserPool", {
      userPoolName: "TWYUserPool",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      userVerification: {
        emailSubject: "Verify your email for TWY",
        emailBody: emailTemplate,
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      lambdaTriggers: {
        postConfirmation: postConfirmationFn,
      },
      email: cognito.UserPoolEmail.withCognito(),
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      "TWYUserPoolClient",
      {
        userPool,
        generateSecret: false,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
      },
    );

    new StringParameter(this, "UserPoolIdParam", {
      parameterName: "/cognito/user-pool-id",
      stringValue: userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new StringParameter(this, "UserPoolClientIdParam", {
      parameterName: "/cognito/user-pool-client-id",
      stringValue: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });
  }
}

function dsqlConnectPolicyFor(
  region: string,
  account: string,
  clusterId: string,
) {
  return new aws_iam.PolicyStatement({
    effect: aws_iam.Effect.ALLOW,
    actions: ["dsql:DbConnectAdmin", "ssm:GetParameter"],
    resources: [
      `arn:aws:dsql:${region}:${account}:cluster/${clusterId}`,
      `arn:aws:ssm:${region}:${account}:parameter/dsql/cluster-id`,
    ],
  });
}
