import { Stack, type StackProps } from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { CorsHttpMethod, HttpAuthorizer, HttpAuthorizerType } from "aws-cdk-lib/aws-apigatewayv2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

interface ApiGatewayProps extends StackProps {
  envName: string;
}

export class ApiGatewayStack extends Stack {
  public readonly apiDomain: string;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id, props);

    const { envName } = props;

    const userPoolId = StringParameter.valueForStringParameter(this, `/cognito/user-pool-id`);
    const userPoolClientId = StringParameter.valueForStringParameter(
      this,
      `/cognito/user-pool-client-id`,
    );

    // Lambda HTTP API
    const lambdaApi = new apigatewayv2.HttpApi(this, `LambdaHttpApi`, {
      apiName: `${envName}-http-api`,
      description: `HTTP API for ${envName}`,
      corsPreflight: {
        allowHeaders: ["*"],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
        ],
        allowOrigins: ["*"],
      },
    });

    const issuer = `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}`;

    const jwtAuthorizer = new HttpAuthorizer(this, "CognitoJwtAuthorizer", {
      httpApi: lambdaApi,
      identitySource: ["$request.header.Authorization"],
      type: HttpAuthorizerType.JWT,
      authorizerName: "CognitoJwtAuthorizer",
      jwtIssuer: issuer,
      jwtAudience: [userPoolClientId],
    });

    new StringParameter(this, "JwtAuthorizerId", {
      parameterName: `/${envName}/cognito/jwt-authorizer-id`,
      stringValue: jwtAuthorizer.authorizerId,
      description: "JWT Authorizer ID",
    });

    new StringParameter(this, "LambdaHttpApiId", {
      parameterName: `/${envName}/lambda/http-api-id`,
      stringValue: lambdaApi.httpApiId,
      description: "Lambda HTTP API ID",
    });

    // Extract API domain from URL for use by CloudFront stack
    const apiDomain = lambdaApi?.url?.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.apiDomain = apiDomain ?? "";
  }
}
