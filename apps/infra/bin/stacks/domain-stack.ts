import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ses from "aws-cdk-lib/aws-ses";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

interface DomainStackProps extends StackProps {
  primaryDomain: string;
  additionalDomains: string[];
  includeWww: boolean;
}

const sanitizeId = (s: string) => s.replace(/\./g, "-");

export class DomainStack extends Stack {
  public readonly hostedZones: Record<string, route53.IHostedZone>;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: DomainStackProps) {
    super(scope, id, props);
    const { primaryDomain, additionalDomains, includeWww } = props;

    const allDomains = [primaryDomain, ...additionalDomains];
    const certNames = includeWww ? allDomains.flatMap((d) => [d, `www.${d}`]) : [...allDomains];

    const idPrefix = sanitizeId(primaryDomain);

    // Preserve original logical ID "HostedZone" for the primary domain so the
    // existing CFN resource is not replaced; new domains get a suffixed ID.
    this.hostedZones = Object.fromEntries(
      allDomains.map((domain) => [
        domain,
        route53.HostedZone.fromLookup(
          this,
          domain === primaryDomain ? "HostedZone" : `HostedZone-${sanitizeId(domain)}`,
          { domainName: domain },
        ),
      ]),
    );

    const registrableZone = (fqdn: string) =>
      this.hostedZones[fqdn] ?? this.hostedZones[fqdn.replace(/^www\./, "")];

    this.certificate = new acm.Certificate(this, "WildcardCert", {
      domainName: certNames[0],
      subjectAlternativeNames: certNames.slice(1),
      validation: acm.CertificateValidation.fromDnsMultiZone(
        Object.fromEntries(certNames.map((name) => [name, registrableZone(name)])),
      ),
    });

    for (const domain of allDomains) {
      const hostedZone = this.hostedZones[domain];
      const dId = sanitizeId(domain);
      const isPrimary = domain === primaryDomain;

      new ses.EmailIdentity(this, isPrimary ? "SesDomain" : `SesDomain-${dId}`, {
        identity: ses.Identity.publicHostedZone(hostedZone),
        dkimSigning: true,
      });

      const spfValues = isPrimary
        ? [
            "v=spf1 include:amazonses.com ~all",
            "google-site-verification=FIK-nfl2SL1L7SB2ajoqSnpERPmJpWy3mDQpKPMWUqg",
          ]
        : ["v=spf1 include:amazonses.com ~all"];

      new route53.TxtRecord(this, isPrimary ? "SpfRecord" : `SpfRecord-${dId}`, {
        zone: hostedZone,
        recordName: domain,
        values: spfValues,
        ttl: Duration.days(2),
      });

      new route53.TxtRecord(this, isPrimary ? "DmarcRecord" : `DmarcRecord-${dId}`, {
        zone: hostedZone,
        recordName: `_dmarc.${domain}`,
        values: [`v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}`],
        ttl: Duration.days(2),
      });
    }

    new CfnOutput(this, "HostedZoneName", {
      value: primaryDomain,
      exportName: "HostedZoneName",
    });

    const corsOrigins = [
      "http://localhost:3000",
      ...allDomains.map((d) => `https://${d}`),
      ...(includeWww ? allDomains.map((d) => `https://www.${d}`) : []),
    ];

    const bucket = new s3.Bucket(this, `${idPrefix}-files-bucket`, {
      bucketName: `${idPrefix}-files-bucket`,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: corsOrigins,
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
