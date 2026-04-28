import { Duration, RemovalPolicy } from "aws-cdk-lib";
import {
  HttpApi,
  HttpAuthorizer,
  HttpRoute,
  HttpRouteKey,
  PayloadFormatVersion,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import type { HttpMethod } from "aws-cdk-lib/aws-events";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, type NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export interface LambdaRouteDefinition {
  functionPath: string; // 'auth/login'
  routeKey: string; // 'POST /api/login'
  env?: Record<string, string>;
  requiresAuth?: boolean;
}

export interface RouterProps {
  envName: string;
  routes: LambdaRouteDefinition[];
  baseDir?: string;
}

export class HttpLambdaRouter extends Construct {
  constructor(scope: Construct, id: string, props: RouterProps) {
    super(scope, id);

    const { envName, routes, baseDir = "src/functions" } = props;

    const httpApiId = StringParameter.valueFromLookup(this, `/${envName}/lambda/http-api-id`);
    const authorizerId = StringParameter.valueFromLookup(
      this,
      `/${envName}/cognito/jwt-authorizer-id`,
    );

    const httpApi = HttpApi.fromHttpApiAttributes(this, "ImportedHttpApi", {
      httpApiId,
    });

    const jwtAuthorizer = HttpAuthorizer.fromHttpAuthorizerAttributes(
      this,
      "ImportedJwtAuthorizer",
      {
        authorizerId,
        authorizerType: "JWT",
      },
    );

    routes.forEach((def) => {
      const functionName = def.functionPath.replaceAll("/", "-");
      const entry = `${baseDir}/${def.functionPath}.ts`;

      const lambdaFn = createNodeLambda(this, `${functionName}Fn`, {
        entry,
        handler: "handler",
        environment: def.env ?? {},
      });

      const [methodStr, path] = def.routeKey.split(" ");
      const method = methodStr as HttpMethod;

      new HttpRoute(this, `${functionName}Route`, {
        httpApi,
        routeKey: HttpRouteKey.with(path!, method),
        integration: new HttpLambdaIntegration(`${functionName}Integration`, lambdaFn, {
          payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
        }),
        authorizer: def.requiresAuth ? jwtAuthorizer : undefined,
      });
    });
  }
}

export type LambdaDefaults = Partial<
  Pick<NodejsFunctionProps, "memorySize" | "timeout" | "runtime" | "architecture" | "bundling">
>;

const DEFAULTS: LambdaDefaults = {
  memorySize: 256,
  timeout: Duration.seconds(15),
  runtime: Runtime.NODEJS_24_X,
  architecture: Architecture.ARM_64,
  bundling: { forceDockerBundling: false },
};

export function createNodeLambda(scope: Construct, id: string, props: NodejsFunctionProps) {
  // Create a custom log group with retention policy if not already provided
  const logGroup =
    props.logGroup ??
    new LogGroup(scope, `${id}LogGroup`, {
      logGroupName: `/aws/lambda/${id}`,
      retention: RetentionDays.THREE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

  const merged: NodejsFunctionProps = {
    ...DEFAULTS,
    ...props,
    logGroup,
  };

  return new NodejsFunction(scope, id, merged);
}
