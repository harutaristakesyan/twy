import type { PreTokenGenerationV2TriggerHandler } from "aws-lambda";

const preTokenGenerationV2Handler: PreTokenGenerationV2TriggerHandler = async (event) => {
  const appUserId = event.request.userAttributes["custom:appUserId"];

  if (!appUserId) {
    console.warn("⚠️ custom:appUserId missing from user attributes — token will lack app_user_id");
    return event;
  }

  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: { app_user_id: appUserId },
      },
      idTokenGeneration: {
        claimsToAddOrOverride: { app_user_id: appUserId },
      },
    },
  };

  return event;
};

export const handler = preTokenGenerationV2Handler;
