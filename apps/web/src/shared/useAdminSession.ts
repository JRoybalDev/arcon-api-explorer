import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./apiClient";
import { useDraftStore } from "../state/draftStore";

export function useAdminSession() {
  const adminKey = useDraftStore((state) => state.adminKey);
  const setAdminKey = useDraftStore((state) => state.setAdminKey);
  const clearAdminKey = useDraftStore((state) => state.clearAdminKey);

  const session = useQuery({
    queryKey: ["admin-session", adminKey],
    queryFn: () => apiClient.admin.verifySession(adminKey),
    enabled: adminKey.length > 0,
    retry: false
  });

  function unlock(nextAdminKey: string) {
    clearAdminKey();
    setAdminKey(nextAdminKey.trim());
  }

  return {
    adminKey,
    isChecking: session.isLoading,
    isInvalid: session.isError,
    isUnlocked: adminKey.length > 0 && session.isSuccess,
    lock: clearAdminKey,
    session,
    unlock
  };
}
