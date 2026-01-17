// dev/src/store/tribunal.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface TribunalStateItem {
  caseId: string;
  arbitrators: string[]; // arbitrator ids
  presiding?: string;    // presiding arbitrator id
  status: 'forming' | 'confirmed';
  formedAt?: string; // ISO string
}

interface TribunalState {
  tribunals: Record<string, TribunalStateItem>; // key by caseId
  get: (caseId: string) => TribunalStateItem | undefined;
  addArbitrator: (caseId: string, arbitratorId: string) => void;
  removeArbitrator: (caseId: string, arbitratorId: string) => void;
  setPresiding: (caseId: string, arbitratorId: string) => void;
  confirm: (caseId: string) => void;
  reset: (caseId: string) => void;
}

export const useTribunalStore = create<TribunalState>()(
  devtools(
    persist(
      (set, get) => ({
        tribunals: {},
        get: (caseId) => get().tribunals[caseId],
        addArbitrator: (caseId, arbitratorId) => set((state) => {
          const current = state.tribunals[caseId] || { caseId, arbitrators: [], status: 'forming' };
          if (current.arbitrators.includes(arbitratorId)) return state;
          return { tribunals: { ...state.tribunals, [caseId]: { ...current, arbitrators: [...current.arbitrators, arbitratorId] } } };
        }),
        removeArbitrator: (caseId, arbitratorId) => set((state) => {
          const current = state.tribunals[caseId];
          if (!current) return state;
          const next = { ...current, arbitrators: current.arbitrators.filter((id) => id !== arbitratorId) };
          if (next.presiding === arbitratorId) {
            const { presiding: _presiding, ...withoutPresiding } = next;
            return { tribunals: { ...state.tribunals, [caseId]: withoutPresiding } };
          }
          return { tribunals: { ...state.tribunals, [caseId]: next } };
        }),
        setPresiding: (caseId, arbitratorId) => set((state) => {
          const current = state.tribunals[caseId];
          if (!current || !current.arbitrators.includes(arbitratorId)) return state;
          return { tribunals: { ...state.tribunals, [caseId]: { ...current, presiding: arbitratorId } } };
        }),
        confirm: (caseId) => set((state) => {
          const current = state.tribunals[caseId];
          if (!current || !current.presiding || current.arbitrators.length === 0) return state;
          return { tribunals: { ...state.tribunals, [caseId]: { ...current, status: 'confirmed', formedAt: new Date().toISOString() } } };
        }),
        reset: (caseId) => set((state) => {
          const { [caseId]: _omit, ...rest } = state.tribunals;
          return { tribunals: rest };
        }),
      }),
      { name: 'tribunal-store' }
    ),
    { name: 'tribunal-store' }
  )
);
