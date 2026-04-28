import { Stack, type StackProps } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { HttpLambdaRouter, type LambdaRouteDefinition } from "./cdk";

interface FunctionsStackProps extends StackProps {
  envName: string;
}

export class FunctionsStack extends Stack {
  constructor(scope: Construct, id: string, props: FunctionsStackProps) {
    super(scope, id, props);

    const { envName } = props;

    const userPoolClientId = StringParameter.valueForStringParameter(
      this,
      "/cognito/user-pool-client-id",
    );

    const authRoutes: LambdaRouteDefinition[] = [
      {
        functionPath: "signUp",
        routeKey: "POST /api/signup",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
      {
        functionPath: "login",
        routeKey: "POST /api/login",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
      {
        functionPath: "verify",
        routeKey: "POST /api/verify",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
      {
        functionPath: "resendVerificationCode",
        routeKey: "POST /api/resend-code",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
      {
        functionPath: "forgotPassword",
        routeKey: "POST /api/forgot-password",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
      {
        functionPath: "confirmForgotPassword",
        routeKey: "POST /api/create-password",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
      {
        functionPath: "refreshToken",
        routeKey: "POST /api/refresh-token",
        env: {
          USER_POOL_CLIENT_ID: userPoolClientId,
        },
      },
    ];

    new HttpLambdaRouter(this, "AuthRouter", { envName, routes: authRoutes });
  }
}
