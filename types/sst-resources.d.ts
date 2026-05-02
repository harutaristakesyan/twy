/**
 * Manual ambient declaration of the SST `Resource` shape.
 *
 * SST regenerates `sst-env.d.ts` (gitignored) on every `sst dev` / `sst deploy`
 * with the real types derived from the deployed components. Until that file
 * exists, this stub keeps `tsc --noEmit` and editor IntelliSense happy.
 *
 * Keep this file in sync with `infra/api.ts` `linkRegistry` and the
 * `link[]` declarations on triggers in `infra/auth.ts`.
 */
declare module "sst" {
  interface Resource {
    Cluster: {
      type: "sst.aws.Aurora";
      clusterArn: string;
      secretArn: string;
      database: string;
      host: string;
      port: number;
      username: string;
      password: string;
      reader: string;
    };
    UserPool: {
      type: "sst.aws.CognitoUserPool";
      id: string;
      arn: string;
    };
    UserPoolClient: {
      type: "sst.aws.CognitoUserPoolClient";
      id: string;
      secret: string;
    };
    Files: {
      type: "sst.aws.Bucket";
      name: string;
      arn: string;
    };
  }
}

export {};
