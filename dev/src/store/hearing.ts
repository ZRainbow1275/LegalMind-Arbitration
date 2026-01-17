// dev/src/store/hearing.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

export interface EvidenceItem {
  id: string;
  caseId: string;
  name: string;
  description?: string;
  isPresenting: boolean;
  addedAt: string; // ISO
}

export interface TranscriptItem {
  id: string;
  caseId: string;
  text: string;
  isKey: boolean;
  ts: string; // ISO
}

interface HearingState {
  evidencesByCase: Record<string, EvidenceItem[]>;
  transcriptsByCase: Record<string, TranscriptItem[]>;
  addEvidence: (caseId: string, name: string, description?: string) => void;
  removeEvidence: (caseId: string, id: string) => void;
  togglePresenting: (caseId: string, id: string) => void;
  moveEvidence: (caseId: string, id: string, dir: 'up' | 'down') => void;
  addTranscript: (caseId: string, text: string) => void;
  toggleKeyPoint: (caseId: string, id: string) => void;
  clearCase: (caseId: string) => void;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useHearingStore = create<HearingState>()(
  devtools(
    persist(
      (set, get) => ({
        evidencesByCase: {},
        transcriptsByCase: {},
        addEvidence: (caseId, name, description) => set((state) => {
          const list = state.evidencesByCase[caseId] || [];
          const next: EvidenceItem = { id: uid(), caseId, name, description, isPresenting: false, addedAt: new Date().toISOString() };
          return { evidencesByCase: { ...state.evidencesByCase, [caseId]: [...list, next] } };
        }),
        removeEvidence: (caseId, id) => set((state) => {
          const list = state.evidencesByCase[caseId] || [];
          return { evidencesByCase: { ...state.evidencesByCase, [caseId]: list.filter(e => e.id !== id) } };
        }),
        togglePresenting: (caseId, id) => set((state) => {
          const list = state.evidencesByCase[caseId] || [];
          const anyPresenting = list.some(e => e.isPresenting && e.id !== id);
          // 单一展示：关闭其他，切换当前
          const nextList = list.map(e => e.id === id ? { ...e, isPresenting: !e.isPresenting } : { ...e, isPresenting: false });
          return { evidencesByCase: { ...state.evidencesByCase, [caseId]: nextList } };
        }),
        moveEvidence: (caseId, id, dir) => set((state) => {
          const list = state.evidencesByCase[caseId] || [];
          const idx = list.findIndex(e => e.id === id);
          if (idx < 0) return state;
          const swapWith = dir === 'up' ? idx - 1 : idx + 1;
          if (swapWith < 0 || swapWith >= list.length) return state;
          const next = list.slice();
          [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
          return { evidencesByCase: { ...state.evidencesByCase, [caseId]: next } };
        }),
        addTranscript: (caseId, text) => set((state) => {
          const list = state.transcriptsByCase[caseId] || [];
          const next: TranscriptItem = { id: uid(), caseId, text, isKey: false, ts: new Date().toISOString() };
          return { transcriptsByCase: { ...state.transcriptsByCase, [caseId]: [next, ...list] } };
        }),
        toggleKeyPoint: (caseId, id) => set((state) => {
          const list = state.transcriptsByCase[caseId] || [];
          return { transcriptsByCase: { ...state.transcriptsByCase, [caseId]: list.map(t => t.id === id ? { ...t, isKey: !t.isKey } : t) } };
        }),
        clearCase: (caseId) => set((state) => {
          const { [caseId]: _e, ...othersE } = state.evidencesByCase;
          const { [caseId]: _t, ...othersT } = state.transcriptsByCase;
          return { evidencesByCase: othersE, transcriptsByCase: othersT };
        })
      }),
      {
        name: 'hearing-store',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ evidencesByCase: state.evidencesByCase, transcriptsByCase: state.transcriptsByCase })
      }
    ),
    { name: 'hearing-store' }
  )
);
