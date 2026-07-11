import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types/api";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  hasHydrated: boolean;
  setSession: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  accessToken: null,
  user: null,
  hasHydrated: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setHasHydrated: (value) => set({ hasHydrated: value }),
}), {
  name: "airline-session-v1",
  storage: createJSONStorage(() => sessionStorage),
  partialize: ({ accessToken, user }) => ({ accessToken, user }),
  onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
}));
