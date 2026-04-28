import { App, Tags } from "aws-cdk-lib";
import { FunctionsStack } from "./functionStack";

const region = process.env.AWS_REGION;
const account = process.env.ACCOUNT_ID!;
const envName = process.env.ENV!;

const app = new App();

const env = {
  region: region,
  account: account,
};

new FunctionsStack(app, `${envName}-functions`, {
  env,
  envName,
});

Tags.of(app).add("Environment", envName);
Tags.of(app).add("Application", "TWY");
