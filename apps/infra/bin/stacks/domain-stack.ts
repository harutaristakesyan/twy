import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ses from "aws-cdk-lib/aws-ses";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

interface DomainStackProps extends StackProps {
  domain: string;
}

export class DomainStack extends Stack {
  public readonly sesIdentity: string;
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: DomainStackProps) {
    super(scope, id, props);
    const { domain } = props;

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: domain,
    });

    const idPrefix = domain.replace(/\./g, "-");

    // Expose these as public properties
    this.hostedZone = hostedZone;

    this.certificate = new acm.Certificate(this, "WildcardCert", {
      domainName: domain,
      subjectAlternativeNames: [`www.${domain}`],
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const sesVerifiedIdentity = new ses.EmailIdentity(this, "SesDomain", {
      identity: ses.Identity.publicHostedZone(hostedZone),
      dkimSigning: true,
    });

    this.sesIdentity = sesVerifiedIdentity.emailIdentityName;

    new route53.TxtRecord(this, "SpfRecord", {
      zone: hostedZone,
      recordName: domain,
      values: ["v=spf1 include:amazonses.com ~all"],
      ttl: Duration.days(2),
    });

    new route53.TxtRecord(this, "DmarcRecord", {
      zone: hostedZone,
      recordName: `_dmarc.${domain}`,
      values: [`v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}`],
      ttl: Duration.days(2),
    });

    new CfnOutput(this, "HostedZoneName", {
      value: domain,
      exportName: "HostedZoneName",
    });

    const bucket = new s3.Bucket(this, `${idPrefix}-files-bucket`, {
      bucketName: `${idPrefix}-files-bucket`,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["http://localhost:3000", `https://${domain}`],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag", "x-amz-request-id", "x-amz-id-2"],
          maxAge: 3000,
        },
      ],
    });

    new StringParameter(this, `${idPrefix}-files-bucket-name`, {
      parameterName: `/files/bucket-name`,
      stringValue: bucket.bucketName,
      description: "Bucket name for the files",
    });
  }
}
