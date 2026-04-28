import { App, Tags } from "aws-cdk-lib";
import { environments } from "./environments";
import { AuthStack } from "./stacks/auth-stack";
import { CloudFrontStack } from "./stacks/cloud-front-stack";
import { DbStack } from "./stacks/db-stack";
import { DomainStack } from "./stacks/domain-stack";
import { ApiGatewayStack } from "./stacks/gateway-stack";

const region = process.env.AWS_REGION!;
const account = process.env.ACCOUNT_ID!;
const envVar = process.env.ENV!;

const config = environments[envVar];

const app = new App();
const env = { region, account };

// 1. Base domain / cert / DNS
const domainStack = new DomainStack(app, `${envVar}-domain`, {
  env,
  ...config,
});

// 2. Database (independent)
new DbStack(app, `${envVar}-database`, { env });

// 3. Auth / Cognito
const authStack = new AuthStack(app, `${envVar}-auth`, { env });

// 4. API Gateway / backend edge (depends on Auth)
const apiGatewayStack = new ApiGatewayStack(app, `${envVar}-api-gateway`, {
  env,
  envName: envVar,
});

apiGatewayStack.addDependency(authStack);

new CloudFrontStack(app, `${envVar}-customer-portal-cf`, {
  env,
  domainName: config.domain,
  hostedZone: domainStack.hostedZone,
  certificate: domainStack.certificate,
  apiDomain: apiGatewayStack.apiDomain,
  spaMode: true,
});

// Tagging
Tags.of(app).add("Environment", envVar);
Tags.of(app).add("Application", "TWY");
