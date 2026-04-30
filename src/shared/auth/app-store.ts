import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiContext } from "@/shared/api/client";
import { LS_KEYS } from "@/shared/config/constants";
import i18n from "@/shared/i18n";

type Language = "en" | "ar";

interface AppState {
  selectedOrgId: string | null;
  selectedOrgLogo: string | null;
  selectedBranchId: string | null;
  language: Language;
  sidebarCollapsed: boolean;
  setSelectedOrg: (id: string | null, logoUrl?: string | null) => void;
  setSelectedBranch: (id: string | null) => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedOrgId: null,
      selectedOrgLogo: null,
      selectedBranchId: null,
      language: "en",
      sidebarCollapsed: false,
      setSelectedOrg: (id, logoUrl) => {
        apiContext.setOrg(id);
        set({ selectedOrgId: id, selectedOrgLogo: logoUrl ?? null });
      },
      setSelectedBranch: (id) => {
        apiContext.setBranch(id);
        set({ selectedBranchId: id });
      },
      setLanguage: (lang) => {
        void i18n.changeLanguage(lang);
        set({ language: lang });
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (c) => set({ sidebarCollapsed: c }),
    }),
    {
      name: LS_KEYS.app,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        selectedOrgId: s.selectedOrgId,
        selectedOrgLogo: s.selectedOrgLogo,
        selectedBranchId: s.selectedBranchId,
        language: s.language,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.selectedOrgId) apiContext.setOrg(state.selectedOrgId);
        if (state?.selectedBranchId) apiContext.setBranch(state.selectedBranchId);
        if (state?.language) void i18n.changeLanguage(state.language);
      },
    },
  ),
);
