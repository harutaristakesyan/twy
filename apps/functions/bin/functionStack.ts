import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import {
  dsqlConnectPolicyFor,
  cognitoUserManagementPolicyFor,
  HttpLambdaRouter,
  LambdaRouteDefinition,
  s3ObjectWritePolicyFor,
} from "./cdk";

interface FunctionsStackProps extends StackProps {
  envName: string;
}

export class FunctionsStack extends Stack {
  constructor(scope: Construct, id: string, props: FunctionsStackProps) {
    super(scope, id, props);

    const { envName } = props;

    const dsqlClusterId = StringParameter.valueForStringParameter(
      this,
      "/dsql/cluster-id",
    );

    const dsql = dsqlConnectPolicyFor(this.region, this.account, dsqlClusterId);

    const userPoolId = StringParameter.valueForStringParameter(
      this,
      "/cognito/user-pool-id",
    );

    const cognitoPolicy = cognitoUserManagementPolicyFor(
      this.region,
      this.account,
      userPoolId,
    );

    const filesBucketName = StringParameter.valueForStringParameter(
      this,
      "/files/bucket-name",
    );

    const fileStoragePolicy = s3ObjectWritePolicyFor(filesBucketName);

    const routes: LambdaRouteDefinition[] = [
      {
        functionPath: "user/get",
        routeKey: "GET /api/user",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "user/self-update",
        routeKey: "PATCH /api/user",
        actions: [dsql, cognitoPolicy],
        env: {
          USER_POOL_ID: userPoolId,
        },
        requiresAuth: true,
      },
      {
        functionPath: "user/list",
        routeKey: "GET /api/users",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "user/update",
        routeKey: "PATCH /api/users/{userId}",
        actions: [dsql, cognitoPolicy],
        env: {
          USER_POOL_ID: userPoolId,
        },
        requiresAuth: true,
      },
      {
        functionPath: "user/delete",
        routeKey: "DELETE /api/users/{userId}",
        actions: [dsql, cognitoPolicy],
        env: {
          USER_POOL_ID: userPoolId,
        },
        requiresAuth: true,
      },
      {
        functionPath: "branch/list",
        routeKey: "GET /api/branches",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "branch/create",
        routeKey: "POST /api/branches",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "branch/update",
        routeKey: "PUT /api/branches/{branchId}",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "branch/delete",
        routeKey: "DELETE /api/branches/{branchId}",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "file/upload",
        routeKey: "POST /api/files",
        actions: [fileStoragePolicy],
        env: {
          FILES_BUCKET_NAME: filesBucketName,
        },
        requiresAuth: true,
      },
      {
        functionPath: "file/delete",
        routeKey: "DELETE /api/files/{fileId}",
        actions: [fileStoragePolicy],
        env: {
          FILES_BUCKET_NAME: filesBucketName,
        },
        requiresAuth: true,
      },
      {
        functionPath: "file/download",
        routeKey: "GET /api/files/{fileId}",
        actions: [fileStoragePolicy],
        env: {
          FILES_BUCKET_NAME: filesBucketName,
        },
        requiresAuth: true,
      },
      {
        functionPath: "load/create",
        routeKey: "POST /api/loads",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "load/list",
        routeKey: "GET /api/loads",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "load/update",
        routeKey: "PUT /api/loads/{loadId}",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "load/changeStatus",
        routeKey: "PATCH /api/loads/{loadId}/status",
        actions: [dsql],
        requiresAuth: true,
      },
      {
        functionPath: "load/delete",
        routeKey: "DELETE /api/loads/{loadId}",
        actions: [dsql],
        requiresAuth: true,
      },
    ];

    new HttpLambdaRouter(this, "FunctionsRouts", { envName, routes });
  }
}
