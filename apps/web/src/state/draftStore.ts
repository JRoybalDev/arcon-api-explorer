import type { SiteDraftInput } from "@fullstack-template/schema";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type DraftState = {
  adminKey: string;
  draft: SiteDraftInput | null;
  clearAdminKey: () => void;
  setAdminKey: (adminKey: string) => void;
  setDraft: (draft: SiteDraftInput) => void;
};

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      adminKey: "",
      draft: null,
      clearAdminKey: () => set({ adminKey: "" }),
      setAdminKey: (adminKey) => set({ adminKey }),
      setDraft: (draft) => set({ draft })
    }),
    {
      name: "arcon-api-explorer-dashboard"
    }
  )
);
