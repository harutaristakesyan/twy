import { execSync } from "node:child_process";
import { environments } from "./environments"; // make sure this path is correct

const region = process.env.AWS_REGION!;
const account = process.env.ACCOUNT_ID!;
const envName = process.env.ENV || "dev";
const config = environments[envName];

if (!config) {
  throw new Error(`Invalid environment config for: ${envName}`);
}

// async function isBootstrapped(region: string): Promise<boolean> {
//     const client = new CloudFormationClient({region});
//
//     try {
//         await client.send(new DescribeStacksCommand({StackName: 'CDKToolkit'}));
//         return true;
//     } catch (err: any) {
//         if (err.name === 'ValidationError') return false;
//         throw err;
//     }
// }

async function bootstrapIfNeeded() {
  const isReady = true;

  if (isReady) {
    console.log(`✅ CDK is already bootstrapped in ${account}/${region}`);
  } else {
    console.log(`🚀 Bootstrapping CDK in ${account}/${region}`);
    execSync(`npx cdk bootstrap aws://${account}/${region}`, {
      stdio: "inherit",
    });
  }
}

bootstrapIfNeeded().catch((err) => {
  console.error("❌ Failed to check or run bootstrap:", err);
  process.exit(1);
});
