import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Returns true if the current user's team has the given permission.
 * For status transitions, pass action="transition" and the target status.
 */
export const usePermission = (entity: string, action: string, status?: string): boolean => {
  const { permissions } = useCurrentUser();
  const key = action === "transition" ? `transition:${status}` : action;
  return Boolean((permissions as Record<string, Record<string, boolean>>)[entity]?.[key]);
};
