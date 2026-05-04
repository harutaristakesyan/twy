/// <reference path="../.sst/platform/config.d.ts" />

/**
 * DynamoDB table that holds a materialized, denormalized copy of each user's
 * resolved auth context (teamId, branchId, branchRestricted, onlyOwnData,
 * full permissions map).
 *
 * Reads happen on every authenticated Lambda invocation; this replaces three
 * sequential Aurora Data API round-trips with a single sub-10 ms DDB GetItem.
 * Writes happen from repository-level hooks whenever the inputs change.
 */
export function createAuthContextTable() {
  const table = new sst.aws.Dynamo("AuthContext", {
    fields: {
      userId: "string",
    },
    primaryIndex: { hashKey: "userId" },
  });

  return { table };
}
