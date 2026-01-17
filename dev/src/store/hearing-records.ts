// dev/src/store/hearing-records.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface HearingRecord {
  id: string;
  caseId: string;
  title: string;
  date: string; // ISO
  participants: number;
  status: '已完成' | '已归档' | '进行中';
  evidences: Array<{ id: string; name: string; description?: string }>;
  transcripts: Array<{ id: string; text: string; isKey: boolean; ts: string }>;
  summary?: { keyPoints: number; evidenceCount: number };
}

interface RecordsState {
  records: HearingRecord[];
  addRecord: (rec: Omit<HearingRecord, 'id' | 'status'> & { status?: HearingRecord['status'] }) => string;
  getById: (id: string) => HearingRecord | undefined;
}

function uid() {
  return `REC-${new Date().toISOString().slice(0,10)}-${Math.random().toString(36).slice(2,7)}`;
}

export const useHearingRecordsStore = create<RecordsState>()(
  devtools(
    persist(
      (set, get) => ({
        records: [
          // 初始示例数据，便于与原页面保持连贯
          {
            id: 'REC-2024-001',
            caseId: 'case-001',
            title: 'ARB-2024-001 第一次开庭',
            date: '2024-11-20',
            participants: 5,
            status: '已完成',
            evidences: [],
            transcripts: [],
            summary: { keyPoints: 0, evidenceCount: 0 }
          },
          {
            id: 'REC-2024-002',
            caseId: 'case-002',
            title: 'ARB-2024-002 质证会议',
            date: '2024-11-28',
            participants: 4,
            status: '已归档',
            evidences: [],
            transcripts: [],
            summary: { keyPoints: 0, evidenceCount: 0 }
          }
        ],
        addRecord: (input) => {
          const id = uid();
          const rec: HearingRecord = {
            id,
            status: input.status ?? '已完成',
            ...input,
          };
          set((s) => ({ records: [rec, ...s.records] }));
          return id;
        },
        getById: (id) => get().records.find(r => r.id === id),
      }),
      { name: 'hearing-records-store' }
    ),
    { name: 'hearing-records-store' }
  )
);

