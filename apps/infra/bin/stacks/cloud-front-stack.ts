import * as path from "node:path";
import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import type * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

interface CloudFrontStackProps extends StackProps {
  primaryDomain: string;
  additionalDomains: string[];
  includeWww: boolean;
  hostedZones: Record<string, route53.IHostedZone>;
  certificate: acm.ICertificate;
  spaMode?: boolean;
  blockRobots?: boolean;
  apiDomain?: string;
}

const sanitizeId = (s: string) => s.replace(/\./g, "-");

export class CloudFrontStack extends Stack {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CloudFrontStackProps) {
    super(scope, id, props);

    const {
      primaryDomain,
      additionalDomains,
      includeWww,
      hostedZones,
      certificate,
      apiDomain,
      spaMode,
      blockRobots = false,
    } = props;

    const allDomains = [primaryDomain, ...additionalDomains];
    const aliasNames = includeWww ? allDomains.flatMap((d) => [d, `www.${d}`]) : [...allDomains];
    const idPrefix = sanitizeId(primaryDomain);

    const registrableZone = (fqdn: string) =>
      hostedZones[fqdn] ?? hostedZones[fqdn.replace(/^www\./, "")];

    // S3 Bucket for static site
    const bucket = new s3.Bucket(this, `${idPrefix}-Bucket`, {
      bucketName: `${idPrefix}-bucket`,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
    });

    // Response headers policy to block robots
    let responseHeadersPolicy: cloudfront.IResponseHeadersPolicy | undefined;
    if (blockRobots) {
      responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
        this,
        `${idPrefix}-NoIndexPolicy`,
        {
          responseHeadersPolicyName: `${idPrefix}-NoIndex`,
          comment: "Prevent robots from indexing content",
          customHeadersBehavior: {
            customHeaders: [
              {
                header: "X-Robots-Tag",
                value: "noindex, nofollow",
                override: true,
              },
            ],
          },
        },
      );
    }

    const rewriteFunction = new cloudfront.Function(this, `${idPrefix}-RewriteFunction`, {
      functionName: `${idPrefix}-Rewrite`,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, "cloudfront-rewrite-function.js"),
      }),
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, `${idPrefix}-Distribution`, {
      certificate,
      domainNames: aliasNames,
      defaultRootObject: "index.html",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: spaMode
        ? [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: "/index.html",
              ttl: Duration.minutes(1),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: "/index.html",
              ttl: Duration.minutes(1),
            },
          ]
        : [
            {
              httpStatus: 403,
              responseHttpStatus: 403,
              responsePagePath: "/error.html",
              ttl: Duration.minutes(1),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 404,
              responsePagePath: "/404.html",
              ttl: Duration.minutes(1),
            },
          ],
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy,
        cachePolicy: new cloudfront.CachePolicy(this, `${idPrefix}-StaticCachePolicy`, {
          cachePolicyName: `${idPrefix}-StaticFilesCache`,
          comment: "Cache static files like HTML, JS, CSS, etc.",
          defaultTtl: Duration.days(1),
          maxTtl: Duration.days(30),
          minTtl: Duration.hours(1),
          cookieBehavior: cloudfront.CacheCookieBehavior.none(),
          headerBehavior: cloudfront.CacheHeaderBehavior.none(),
          queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
        }),
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
    });

    // Optionally wire API Gateway behind CloudFront if apiDomain provided
    if (apiDomain) {
      const originRequestPolicy = new cloudfront.OriginRequestPolicy(
        this,
        "ApiOriginRequestPolicy",
        {
          originRequestPolicyName: `${idPrefix}-AllowAllQueryStrings`,
          comment: "Forward all query strings and selected headers for API Gateway",
          queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
          headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
            "Accept",
            "Content-Type",
            "Origin",
            "X-Signature",
            "X-Event-Name",
          ),
        },
      );

      const cachePolicy = new cloudfront.CachePolicy(this, "ApiCachePolicy", {
        cachePolicyName: `${idPrefix}-ApiCachePolicy`,
        comment: "Cache policy for admin API",
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        minTtl: Duration.minutes(0),
        maxTtl: Duration.seconds(1),
        defaultTtl: Duration.minutes(0),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Authorization",
          "Accept",
          "Content-Type",
          "Origin",
        ),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
      });

      this.distribution.addBehavior("/api/*", new origins.HttpOrigin(apiDomain), {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy,
        cachePolicy,
      });
    }

    // DNS Records — one ARecord per alias, in its registrable hosted zone.
    // Preserve original logical IDs for primary apex/www so the existing CFN
    // resources are not replaced (would cause brief DNS downtime).
    const aliasLogicalId = (name: string) => {
      if (name === primaryDomain) return `${idPrefix}-ARecord-Root`;
      if (name === `www.${primaryDomain}`) return `${idPrefix}-ARecord-WWW`;
      return `${idPrefix}-ARecord-${sanitizeId(name)}`;
    };

    for (const name of aliasNames) {
      new route53.ARecord(this, aliasLogicalId(name), {
        recordName: name,
        zone: registrableZone(name),
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }

    new StringParameter(this, "BucketName", {
      parameterName: `/${idPrefix}/site/bucketName`,
      stringValue: bucket.bucketName,
      description: "Bucket name for the web site",
    });

    new StringParameter(this, "CloudFrontId", {
      parameterName: `/${idPrefix}/site/distributionId`,
      stringValue: this.distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new StringParameter(this, "CloudFrontDomain", {
      parameterName: `/${idPrefix}/site/distributionDomain`,
      stringValue: this.distribution.domainName,
      description: "CloudFront distribution domain",
    });
  }
}
