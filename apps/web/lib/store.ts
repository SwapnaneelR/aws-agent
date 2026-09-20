import { create } from "zustand";

interface StudioState {
  activeProjectId: string | null;
  activeSessionId: string | null;
  selectedArchVersionId: string | null;
  useOpusModel: boolean;
  isDemoMode: boolean;
  isSidebarOpen: boolean;
  activeTab: "canvas" | "cdk" | "spec";

  // Actions
  setActiveProject: (id: string | null) => void;
  setActiveSession: (id: string | null) => void;
  setSelectedArchVersion: (id: string | null) => void;
  setUseOpusModel: (useOpus: boolean) => void;
  setIsDemoMode: (isDemo: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: "canvas" | "cdk" | "spec") => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  activeProjectId: "proj_bitcoin_defi_01",
  activeSessionId: "sess_settlement_v2",
  selectedArchVersionId: "arch_v1",
  useOpusModel: false,
  isDemoMode: true, // Defaults to true for immediate out-of-the-box exploration
  isSidebarOpen: true,
  activeTab: "canvas",

  setActiveProject: (id) =>
    set({
      activeProjectId: id,
      activeSessionId: null,
      selectedArchVersionId: null,
    }),

  setActiveSession: (id) =>
    set({
      activeSessionId: id,
      selectedArchVersionId: null,
    }),

  setSelectedArchVersion: (id) => set({ selectedArchVersionId: id }),

  setUseOpusModel: (useOpus) => set({ useOpusModel: useOpus }),

  setIsDemoMode: (isDemo) => set({ isDemoMode: isDemo }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  setActiveTab: (tab) => set({ activeTab: tab }),
}));

