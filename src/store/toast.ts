import { create } from "zustand";
export type ToastKind = "success" | "error" | "info";
interface Toast { id: string; message: string; kind: ToastKind; }
interface ToastState { toasts: Toast[]; push: (message: string, kind?: ToastKind) => void; remove: (id: string) => void; }
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, kind = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    set({ toasts: [...get().toasts, { id, message, kind }] });
    window.setTimeout(() => get().remove(id), 4500);
  },
  remove: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
