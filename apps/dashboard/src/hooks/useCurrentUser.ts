import { useAuth } from "@/providers/AuthProvider";
import { emptyPermissionsMap } from "@/utils/permissions";

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
    permissions: authMe?.permissions ?? emptyPermissionsMap(),
  };
};
