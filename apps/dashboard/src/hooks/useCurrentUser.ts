import { useAuth } from "@/providers/AuthProvider";
import { normalizePermissionsMap } from "@/utils/permissions";

export const useCurrentUser = () => {
  const { authMe, userLoading: loading, refetchAuthMe } = useAuth();

  const user = authMe
    ? {
        email: authMe.user.email,
        firstName: authMe.user.firstName,
        lastName: authMe.user.lastName,
        isActive: authMe.user.isActive,
        branch: authMe.user.branch,
      }
    : null;

  return {
    user,
    loading,
    refetch: refetchAuthMe,
    authMe,
    refetchAuthMe,
    permissions: normalizePermissionsMap(authMe?.permissions),
  };
};
