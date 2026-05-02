import { useAuth } from "@/providers/AuthProvider";

export const useCurrentUser = () => {
  const { currentUser: user, userLoading: loading, refetchUser: refetch, permissions } = useAuth();
  return { user, loading, refetch, permissions };
};
