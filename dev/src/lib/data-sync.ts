'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type SyncEventPriority = 'low' | 'medium' | 'high';

export type SyncEventType =
  | 'case_created'
  | 'case_updated'
  | 'case_deleted'
  | 'mediation_created'
  | 'mediation_updated'
  | 'mediation_completed'
  | 'hearing_scheduled'
  | 'hearing_started'
  | 'hearing_completed'
  | 'document_uploaded'
  | 'document_signed'
  | 'message_created'
  | 'message_updated'
  | 'notification_created'
  | 'notification_updated'
  | 'ai_task_created'
  | 'ai_task_updated'
  | 'ai_task_completed'
  | 'role_changed'
  | 'user_created'
  | 'user_updated';

export type SyncEvent<TData = unknown> = {
  id: string;
  type: SyncEventType;
  source: string;
  timestamp: Date;
  processed: boolean;
  priority: SyncEventPriority;
  data?: TData;
  caseId?: string;
  mediationId?: string;
  userId?: string;
  aiTaskId?: string;
};

export type SyncModuleStatus = 'active' | 'inactive' | 'error';

export type SyncModuleState = {
  id: string;
  status: SyncModuleStatus;
  registeredAt: Date;
  lastSync: Date;
  pendingEvents: SyncEvent[];
  processedEvents: number;
  errorCount: number;
  lastError?: string;
};

type DataSyncConfig = {
  syncInterval: number;
  batchSize: number;
  maxEvents: number;
  debug: boolean;
};

type DataSyncStore = {
  config: DataSyncConfig;
  events: SyncEvent[];
  modules: Record<string, SyncModuleState>;
  subscribers: Record<string, Array<(event: SyncEvent) => void>>;
  registerModule: (moduleId: string) => void;
  unregisterModule: (moduleId: string) => void;
  publishEvent: (
    input: Omit<SyncEvent, 'id' | 'timestamp' | 'processed'>
  ) => SyncEvent;
  subscribe: (moduleId: string, handler: (event: SyncEvent) => void) => () => void;
  processEvents: (moduleId: string) => SyncEvent[];
  syncModules: () => void;
  getModuleState: (moduleId: string) => SyncModuleState | null;
  updateModuleState: (moduleId: string, updates: Partial<SyncModuleState>) => void;
};

function generateEventId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `event-${uuid}`;
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const useDataSyncStore = create<DataSyncStore>()(
  devtools(
    (set, get) => ({
      config: {
        syncInterval: 5_000,
        batchSize: 50,
        maxEvents: 1_000,
        debug: false,
      },
      events: [],
      modules: {},
      subscribers: {},

      registerModule: (moduleId) => {
        set((state) => {
          if (state.modules[moduleId]) return state;
          const now = new Date();
          return {
            modules: {
              ...state.modules,
              [moduleId]: {
                id: moduleId,
                status: 'active',
                registeredAt: now,
                lastSync: new Date(0),
                pendingEvents: [],
                processedEvents: 0,
                errorCount: 0,
              },
            },
            subscribers: {
              ...state.subscribers,
              [moduleId]: state.subscribers[moduleId] ?? [],
            },
          };
        });
      },

      unregisterModule: (moduleId) => {
        set((state) => {
          const { [moduleId]: _removedModule, ...remainingModules } = state.modules;
          const { [moduleId]: _removedSubscribers, ...remainingSubscribers } = state.subscribers;
          return {
            modules: remainingModules,
            subscribers: remainingSubscribers,
          };
        });
      },

      publishEvent: (input) => {
        const event: SyncEvent = {
          id: generateEventId(),
          timestamp: new Date(),
          processed: false,
          ...input,
        };

        set((state) => ({
          events: [event, ...state.events].slice(0, state.config.maxEvents),
        }));

        const { subscribers } = get();
        Object.entries(subscribers).forEach(([moduleId, handlers]) => {
          handlers.forEach((handler) => {
            try {
              handler(event);
            } catch (error) {
              console.error(`[DataSync] Error notifying module ${moduleId}:`, error);
            }
          });
        });

        set((state) => {
          const nextModules: Record<string, SyncModuleState> = { ...state.modules };
          Object.keys(nextModules).forEach((moduleId) => {
            if (moduleId === event.source) return;
            const moduleState = nextModules[moduleId];
            nextModules[moduleId] = {
              ...moduleState,
              pendingEvents: [...moduleState.pendingEvents, event],
            };
          });
          return { modules: nextModules };
        });

        return event;
      },

      subscribe: (moduleId, handler) => {
        set((state) => ({
          subscribers: {
            ...state.subscribers,
            [moduleId]: [...(state.subscribers[moduleId] ?? []), handler],
          },
        }));

        return () => {
          set((state) => ({
            subscribers: {
              ...state.subscribers,
              [moduleId]: (state.subscribers[moduleId] ?? []).filter((h) => h !== handler),
            },
          }));
        };
      },

      processEvents: (moduleId) => {
        const state = get();
        const moduleState = state.modules[moduleId];
        if (!moduleState) return [];

        const batch = moduleState.pendingEvents.slice(0, state.config.batchSize);
        set((prev) => ({
          modules: {
            ...prev.modules,
            [moduleId]: {
              ...moduleState,
              pendingEvents: moduleState.pendingEvents.slice(state.config.batchSize),
              lastSync: new Date(),
              processedEvents: moduleState.processedEvents + batch.length,
              errorCount: 0,
            },
          },
        }));

        return batch;
      },

      syncModules: () => {
        const { modules, config } = get();
        if (!config.debug) return;
        Object.entries(modules).forEach(([moduleId, moduleState]) => {
          if (moduleState.pendingEvents.length === 0) return;
          console.log(
            `[DataSync] Syncing module ${moduleId} with ${moduleState.pendingEvents.length} pending events`
          );
        });
      },

      getModuleState: (moduleId) => get().modules[moduleId] ?? null,

      updateModuleState: (moduleId, updates) => {
        set((state) => {
          const existing = state.modules[moduleId];
          if (!existing) return state;
          return {
            modules: {
              ...state.modules,
              [moduleId]: { ...existing, ...updates },
            },
          };
        });
      },
    }),
    { name: 'data-sync-store' }
  )
);

class DataSyncManager {
  private static instance: DataSyncManager | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): DataSyncManager {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  startAutoSync() {
    const { config, syncModules } = useDataSyncStore.getState();
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      syncModules();
    }, config.syncInterval);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  triggerSync() {
    const { syncModules } = useDataSyncStore.getState();
    syncModules();
  }

  publishCaseEvent<TCase extends { id: string }>(
    type: 'created' | 'updated' | 'deleted',
    caseData: TCase,
    source: string
  ) {
    const { publishEvent } = useDataSyncStore.getState();
    publishEvent({
      type: `case_${type}` as SyncEventType,
      source,
      data: caseData as unknown,
      caseId: caseData.id,
      priority: type === 'deleted' ? 'high' : 'medium',
    });
  }

  publishMediationEvent<TMediation extends { id: string; caseId: string }>(
    type: 'created' | 'updated' | 'completed',
    mediationData: TMediation,
    source: string
  ) {
    const { publishEvent } = useDataSyncStore.getState();
    publishEvent({
      type: `mediation_${type}` as SyncEventType,
      source,
      data: mediationData as unknown,
      mediationId: mediationData.id,
      caseId: mediationData.caseId,
      priority: type === 'completed' ? 'high' : 'medium',
    });
  }

  publishHearingEvent<THearing extends { caseId: string }>(
    type: 'scheduled' | 'started' | 'completed',
    hearingData: THearing,
    source: string
  ) {
    const { publishEvent } = useDataSyncStore.getState();
    publishEvent({
      type: `hearing_${type}` as SyncEventType,
      source,
      data: hearingData as unknown,
      caseId: hearingData.caseId,
      priority: 'high',
    });
  }

  publishDocumentEvent<TDocument extends { caseId: string }>(
    type: 'uploaded' | 'signed',
    documentData: TDocument,
    source: string
  ) {
    const { publishEvent } = useDataSyncStore.getState();
    publishEvent({
      type: `document_${type}` as SyncEventType,
      source,
      data: documentData as unknown,
      caseId: documentData.caseId,
      priority: type === 'signed' ? 'high' : 'medium',
    });
  }

  publishAITaskEvent<TTask extends { id: string }>(
    type: 'created' | 'updated' | 'completed',
    taskData: TTask,
    source: string
  ) {
    const { publishEvent } = useDataSyncStore.getState();
    publishEvent({
      type: `ai_task_${type}` as SyncEventType,
      source,
      data: taskData as unknown,
      aiTaskId: taskData.id,
      priority: 'medium',
    });
  }
}

export type ModuleSync = {
  register: () => void;
  unregister: () => void;
  subscribeToEvents: (handler: (event: SyncEvent) => void) => () => void;
  processPendingEvents: () => SyncEvent[];
  moduleState: SyncModuleState | null;
  updateState: (updates: Partial<SyncModuleState>) => void;
};

export function useModuleSync(moduleId: string): ModuleSync {
  const {
    registerModule,
    unregisterModule,
    subscribe,
    processEvents,
    getModuleState,
    updateModuleState,
  } = useDataSyncStore();

  const moduleState = getModuleState(moduleId);

  return useMemo(
    () => ({
      register: () => registerModule(moduleId),
      unregister: () => unregisterModule(moduleId),
      subscribeToEvents: (handler) => subscribe(moduleId, handler),
      processPendingEvents: () => processEvents(moduleId),
      moduleState,
      updateState: (updates) => updateModuleState(moduleId, updates),
    }),
    [
      moduleId,
      moduleState,
      registerModule,
      unregisterModule,
      subscribe,
      processEvents,
      updateModuleState,
    ]
  );
}

export const dataSyncManager = DataSyncManager.getInstance();
