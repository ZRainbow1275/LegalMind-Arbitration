// dev/src/store/case-progress.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CaseProgress {
  id: string;
  caseId: string;
  stage: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
  progress: number; // 0-100
  milestones: Milestone[];
  timeline: TimelineEvent[];
  nextActions: NextAction[];
  estimatedCompletion?: string;
  actualCompletion?: string;
  blockers: Blocker[];
  lastUpdated: string;
  updatedBy: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  completedDate?: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
}

export interface TimelineEvent {
  id: string;
  type: 'milestone' | 'document' | 'hearing' | 'decision' | 'communication' | 'other';
  title: string;
  description: string;
  date: string;
  participants: string[];
  documents: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  impact: 'low' | 'medium' | 'high';
}

export interface NextAction {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[];
  estimatedHours?: number;
}

export interface Blocker {
  id: string;
  title: string;
  description: string;
  type: 'technical' | 'legal' | 'procedural' | 'external' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedDate: string;
  reportedBy: string;
  resolvedDate?: string;
  resolution?: string;
  impact: string;
}

interface CaseProgressState {
  progresses: { [caseId: string]: CaseProgress };
  
  // 基本操作
  getProgress: (caseId: string) => CaseProgress | undefined;
  setProgress: (caseId: string, progress: Partial<CaseProgress>) => void;
  updateProgress: (caseId: string, updates: Partial<CaseProgress>) => void;
  deleteProgress: (caseId: string) => void;
  
  // 里程碑管理
  addMilestone: (caseId: string, milestone: Omit<Milestone, 'id'>) => void;
  updateMilestone: (caseId: string, milestoneId: string, updates: Partial<Milestone>) => void;
  completeMilestone: (caseId: string, milestoneId: string) => void;
  deleteMilestone: (caseId: string, milestoneId: string) => void;
  
  // 时间线管理
  addTimelineEvent: (caseId: string, event: Omit<TimelineEvent, 'id'>) => void;
  updateTimelineEvent: (caseId: string, eventId: string, updates: Partial<TimelineEvent>) => void;
  deleteTimelineEvent: (caseId: string, eventId: string) => void;
  
  // 下一步行动管理
  addNextAction: (caseId: string, action: Omit<NextAction, 'id'>) => void;
  updateNextAction: (caseId: string, actionId: string, updates: Partial<NextAction>) => void;
  completeNextAction: (caseId: string, actionId: string) => void;
  deleteNextAction: (caseId: string, actionId: string) => void;
  
  // 阻碍管理
  addBlocker: (caseId: string, blocker: Omit<Blocker, 'id'>) => void;
  updateBlocker: (caseId: string, blockerId: string, updates: Partial<Blocker>) => void;
  resolveBlocker: (caseId: string, blockerId: string, resolution: string) => void;
  deleteBlocker: (caseId: string, blockerId: string) => void;
  
  // 统计和查询
  getCasesByStatus: (status: CaseProgress['status']) => CaseProgress[];
  getOverdueMilestones: () => { caseId: string; milestones: Milestone[] }[];
  getUpcomingActions: (days?: number) => { caseId: string; actions: NextAction[] }[];
  getCriticalBlockers: () => { caseId: string; blockers: Blocker[] }[];
  
  // 进度计算
  calculateProgress: (caseId: string) => number;
  updateProgressPercentage: (caseId: string) => void;
}

export const useCaseProgressStore = create<CaseProgressState>()(
  persist(
    (set, get) => ({
      progresses: {},
      
      // 基本操作
      getProgress: (caseId) => get().progresses[caseId],
      
      setProgress: (caseId, progress) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              id: `progress-${caseId}`,
              caseId,
              stage: 'initial',
              status: 'pending',
              progress: 0,
              milestones: [],
              timeline: [],
              nextActions: [],
              blockers: [],
              lastUpdated: new Date().toISOString(),
              updatedBy: 'system',
              ...progress,
            }
          }
        }));
      },
      
      updateProgress: (caseId, updates) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              ...updates,
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      deleteProgress: (caseId) => {
        set((state) => {
          const { [caseId]: deleted, ...rest } = state.progresses;
          return { progresses: rest };
        });
      },
      
      // 里程碑管理
      addMilestone: (caseId, milestone) => {
        const id = `milestone-${Date.now()}`;
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              milestones: [
                ...state.progresses[caseId]?.milestones || [],
                { ...milestone, id }
              ],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      updateMilestone: (caseId, milestoneId, updates) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              milestones: state.progresses[caseId]?.milestones.map(m =>
                m.id === milestoneId ? { ...m, ...updates } : m
              ) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      completeMilestone: (caseId, milestoneId) => {
        get().updateMilestone(caseId, milestoneId, {
          status: 'completed',
          completedDate: new Date().toISOString()
        });
        get().updateProgressPercentage(caseId);
      },
      
      deleteMilestone: (caseId, milestoneId) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              milestones: state.progresses[caseId]?.milestones.filter(m => m.id !== milestoneId) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      // 时间线管理
      addTimelineEvent: (caseId, event) => {
        const id = `event-${Date.now()}`;
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              timeline: [
                ...state.progresses[caseId]?.timeline || [],
                { ...event, id }
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      updateTimelineEvent: (caseId, eventId, updates) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              timeline: state.progresses[caseId]?.timeline.map(e =>
                e.id === eventId ? { ...e, ...updates } : e
              ) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      deleteTimelineEvent: (caseId, eventId) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              timeline: state.progresses[caseId]?.timeline.filter(e => e.id !== eventId) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      // 下一步行动管理
      addNextAction: (caseId, action) => {
        const id = `action-${Date.now()}`;
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              nextActions: [
                ...state.progresses[caseId]?.nextActions || [],
                { ...action, id }
              ],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      updateNextAction: (caseId, actionId, updates) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              nextActions: state.progresses[caseId]?.nextActions.map(a =>
                a.id === actionId ? { ...a, ...updates } : a
              ) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      completeNextAction: (caseId, actionId) => {
        get().updateNextAction(caseId, actionId, { status: 'completed' });
      },
      
      deleteNextAction: (caseId, actionId) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              nextActions: state.progresses[caseId]?.nextActions.filter(a => a.id !== actionId) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      // 阻碍管理
      addBlocker: (caseId, blocker) => {
        const id = `blocker-${Date.now()}`;
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              blockers: [
                ...state.progresses[caseId]?.blockers || [],
                { ...blocker, id }
              ],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      updateBlocker: (caseId, blockerId, updates) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              blockers: state.progresses[caseId]?.blockers.map(b =>
                b.id === blockerId ? { ...b, ...updates } : b
              ) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      resolveBlocker: (caseId, blockerId, resolution) => {
        get().updateBlocker(caseId, blockerId, {
          resolvedDate: new Date().toISOString(),
          resolution
        });
      },
      
      deleteBlocker: (caseId, blockerId) => {
        set((state) => ({
          progresses: {
            ...state.progresses,
            [caseId]: {
              ...state.progresses[caseId],
              blockers: state.progresses[caseId]?.blockers.filter(b => b.id !== blockerId) || [],
              lastUpdated: new Date().toISOString(),
            }
          }
        }));
      },
      
      // 统计和查询
      getCasesByStatus: (status) => {
        return Object.values(get().progresses).filter(p => p.status === status);
      },
      
      getOverdueMilestones: () => {
        const now = new Date();
        return Object.entries(get().progresses)
          .map(([caseId, progress]) => ({
            caseId,
            milestones: progress.milestones.filter(m => 
              m.status === 'pending' && new Date(m.dueDate) < now
            )
          }))
          .filter(item => item.milestones.length > 0);
      },
      
      getUpcomingActions: (days = 7) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        return Object.entries(get().progresses)
          .map(([caseId, progress]) => ({
            caseId,
            actions: progress.nextActions.filter(a => 
              a.status === 'pending' && new Date(a.dueDate) <= futureDate
            )
          }))
          .filter(item => item.actions.length > 0);
      },
      
      getCriticalBlockers: () => {
        return Object.entries(get().progresses)
          .map(([caseId, progress]) => ({
            caseId,
            blockers: progress.blockers.filter(b => 
              !b.resolvedDate && (b.severity === 'high' || b.severity === 'critical')
            )
          }))
          .filter(item => item.blockers.length > 0);
      },
      
      // 进度计算
      calculateProgress: (caseId) => {
        const progress = get().progresses[caseId];
        if (!progress || progress.milestones.length === 0) return 0;
        
        const completedMilestones = progress.milestones.filter(m => m.status === 'completed').length;
        return Math.round((completedMilestones / progress.milestones.length) * 100);
      },
      
      updateProgressPercentage: (caseId) => {
        const percentage = get().calculateProgress(caseId);
        get().updateProgress(caseId, { progress: percentage });
      },
    }),
    {
      name: 'case-progress-storage',
      partialize: (state) => ({ progresses: state.progresses }),
    }
  )
);
