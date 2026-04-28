import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as path from 'path'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'

interface AppDeployStackProps extends StackProps {
  cloudFormantName: string
}

export class AppDeployStack extends Stack {
  constructor(scope: Construct, id: string, props: AppDeployStackProps) {
    super(scope, id, props)

    const bucketName = StringParameter.valueForStringParameter(this, `/${props.cloudFormantName}/site/bucketName`)

    const cloudFrontId = StringParameter.valueForStringParameter(this, `/${props.cloudFormantName}/site/distributionId`)

    const cloudFrontDomain = StringParameter.valueForStringParameter(this, `/${props.cloudFormantName}/site/distributionDomain`)

    const bucket = s3.Bucket.fromBucketName(this, `UIBucket`, bucketName)

    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'ImportedDistribution', {
      distributionId: cloudFrontId,
      domainName: cloudFrontDomain,
    })

    new s3deploy.BucketDeployment(this, 'DeployUI', {
      sources: [s3deploy.Source.asset(path.resolve(__dirname, '../out'))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      retainOnDelete: false,
      prune: true,
    })
  }
}
