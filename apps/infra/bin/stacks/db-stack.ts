import { Stack, type StackProps } from "aws-cdk-lib";
import * as dsql from "aws-cdk-lib/aws-dsql";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export class DbStack extends Stack {
  public readonly cluster: dsql.CfnCluster;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.cluster = new dsql.CfnCluster(this, `DCluster`, {
      deletionProtectionEnabled: false,
    });

    new StringParameter(this, "DsqlClusterIdParam", {
      parameterName: "/dsql/cluster-id",
      stringValue: this.cluster.ref,
      description: "DSQL Cluster ID",
    });
  }
}
