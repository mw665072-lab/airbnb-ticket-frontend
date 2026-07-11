import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FlightOffer, SearchFlightsPayload } from "@/types/api";
interface DraftState { offer: FlightOffer | null; search: SearchFlightsPayload | null; setDraft: (offer: FlightOffer, search: SearchFlightsPayload) => void; clear: () => void; }
export const useBookingDraftStore = create<DraftState>()(persist((set) => ({
  offer: null, search: null,
  setDraft: (offer, search) => set({ offer, search }),
  clear: () => set({ offer: null, search: null }),
}), { name: "airline-booking-draft-v1", storage: createJSONStorage(() => sessionStorage) }));
