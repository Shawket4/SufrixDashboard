import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiContext } from "@/shared/api/client";
import { queryClient } from "@/shared/api/query";
import { useAppStore } from "@/shared/auth/app-store";
import { LS_KEYS } from "@/shared/config/constants";
import type { UserPublic } from "@/shared/types";

interface AuthState {
  user: UserPublic | null;
  token: string | null;
  hasHydrated: boolean;
  signIn: (token: string, user: UserPublic) => void;
  signOut: () => void;
  setUser: (user: UserPublic) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      signIn: (token, user) => {
        apiContext.setToken(token);
        set({ token, user });
      },
      signOut: () => {
        // Purge api contexts
        apiContext.setToken(null);
        apiContext.setOrg(null);
        apiContext.setBranch(null);

        // Reset persistent app context
        useAppStore.setState({
          selectedOrgId: null,
          selectedOrgLogo: null,
          selectedBranchId: null,
        });

        // Flush React Query cached requests
        queryClient.clear();

        set({ token: null, user: null });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: LS_KEYS.auth,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) apiContext.setToken(state.token);
        state?.hasHydrated !== undefined &&
          useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);

// Wire the 401 handler so the axios interceptor can purge auth cleanly.
apiContext.setOnUnauthorized(() => {
  useAuthStore.getState().signOut();
  // Only redirect if we're not already on /login, and not mid-login.
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
});
