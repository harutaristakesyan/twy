import { useAuth } from "@/providers/AuthProvider";
import { normalizePermissionsMap } from "@/utils/permissions";

export const useCurrentUser = () => {
  const {
    currentUser: user,
    userLoading: loading,
    refetchUser: refetch,
    authMe,
    refetchAuthMe,
  } = useAuth();
  return {
    user,
    loading,
    refetch,
    authMe,
    refetchAuthMe,
    permissions: normalizePermissionsMap(authMe?.permissions),
  };
};
