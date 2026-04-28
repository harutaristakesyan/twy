import { App } from "aws-cdk-lib";
import { environments } from "./environments";
import { AppDeployStack } from "./stack";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const region = requireEnv("AWS_REGION");
const account = requireEnv("ACCOUNT_ID");
const envVar = requireEnv("ENV");

const config = environments[envVar];

if (!config) throw new Error("No config found");

const app = new App();

const env = {
  region: region,
  account: account,
};

new AppDeployStack(app, `${envVar}-customer-portal`, {
  env,
  cloudFormantName: config.cloudFormantName,
});
