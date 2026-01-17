// src/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 用于生成唯一ID的计数器，避免hydration mismatch
let caseIdCounter = 0;
const generateCaseId = () => `case-${++caseIdCounter}`;
import type {
  User,
  IndividualProfile,
  EnterpriseProfile,
  ArbitrationCase,
  ActionItem,
  Notification
} from '@/types';
import type { PlatformRoleKey, UserCapabilities } from '@/lib/capabilities';

// User store
interface UserState {
  currentUser: User | null;
  profile: IndividualProfile | EnterpriseProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  platformRoles: PlatformRoleKey[];
  capabilities: UserCapabilities | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: IndividualProfile | EnterpriseProfile | null) => void;
  setAuthMeta: (platformRoles: PlatformRoleKey[], capabilities: UserCapabilities | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        currentUser: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        platformRoles: [],
        capabilities: null,
        setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
        setProfile: (profile) => set({ profile }),
        setAuthMeta: (platformRoles, capabilities) => set({ platformRoles, capabilities }),
        setLoading: (loading) => set({ loading }),
        logout: () => set({
          currentUser: null,
          profile: null,
          isAuthenticated: false,
          platformRoles: [],
          capabilities: null,
        }),
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          currentUser: state.currentUser,
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
          platformRoles: state.platformRoles,
          capabilities: state.capabilities,
        }),
      }
    ),
    { name: 'user-store' }
  )
);

// Cases store
interface CasesState {
  cases: ArbitrationCase[];
  currentCase: ArbitrationCase | null;
  loading: boolean;
  filters: {
    status?: string;
    search?: string;
  };
  setCases: (
    cases:
      | ArbitrationCase[]
      | ((prevCases: ArbitrationCase[]) => ArbitrationCase[])
  ) => void;
  setCurrentCase: (case_: ArbitrationCase | null) => void;
  addCase: (case_: ArbitrationCase) => void;
  updateCase: (caseId: string, updates: Partial<ArbitrationCase>) => void;
  removeCase: (caseId: string) => void;
  duplicateCase: (caseId: string) => ArbitrationCase | null;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<CasesState['filters']>) => void;
}

export const useCasesStore = create<CasesState>()(
  devtools(
    (set, get) => ({
      cases: [],
      currentCase: null,
      loading: false,
      filters: {},
      setCases: (casesOrUpdater) =>
        set((state) => ({
          cases:
            typeof casesOrUpdater === 'function'
              ? casesOrUpdater(state.cases)
              : casesOrUpdater,
        })),
      setCurrentCase: (currentCase) => set({ currentCase }),
      addCase: (newCase) => set((state) => ({
        cases: [...state.cases, newCase]
      })),
      updateCase: (caseId, updates) => set((state) => ({
        cases: state.cases.map(case_ =>
          case_.id === caseId ? { ...case_, ...updates } : case_
        ),
        currentCase: state.currentCase?.id === caseId
          ? { ...state.currentCase, ...updates }
          : state.currentCase
      })),
      removeCase: (caseId) => set((state) => ({
        cases: state.cases.filter(case_ => case_.id !== caseId),
        currentCase: state.currentCase?.id === caseId ? null : state.currentCase
      })),
      duplicateCase: (caseId) => {
        const originalCase = get().cases.find((case_) => case_.id === caseId);
        if (!originalCase) return null;

        const now = new Date();
        const duplicatedCase: ArbitrationCase = {
          ...originalCase,
          id: generateCaseId(), // 使用计数器避免 hydration mismatch
          caseNumber: `${originalCase.caseNumber}-副本`,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ cases: [...state.cases, duplicatedCase] }));
        return duplicatedCase;
      },
      setLoading: (loading) => set({ loading }),
      setFilters: (filters) => set((state) => ({ 
        filters: { ...state.filters, ...filters } 
      })),
    }),
    { name: 'cases-store' }
  )
);

// Dashboard store
interface DashboardState {
  actionItems: ActionItem[];
  notifications: Notification[];
  loading: boolean;
  setActionItems: (
    items: ActionItem[] | ((prevItems: ActionItem[]) => ActionItem[])
  ) => void;
  addActionItem: (item: ActionItem) => void;
  completeActionItem: (id: string) => void;
  setNotifications: (
    notifications:
      | Notification[]
      | ((prevNotifications: Notification[]) => Notification[])
  ) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      actionItems: [],
      notifications: [],
      loading: false,
      setActionItems: (itemsOrUpdater) =>
        set((state) => ({
          actionItems:
            typeof itemsOrUpdater === 'function'
              ? itemsOrUpdater(state.actionItems)
              : itemsOrUpdater,
        })),
      addActionItem: (item) => set((state) => ({
        actionItems: [...state.actionItems, item]
      })),
      completeActionItem: (id) => set((state) => ({
        actionItems: state.actionItems.map(item =>
          item.id === id ? { ...item, completed: true } : item
        )
      })),
      setNotifications: (notificationsOrUpdater) =>
        set((state) => ({
          notifications:
            typeof notificationsOrUpdater === 'function'
              ? notificationsOrUpdater(state.notifications)
              : (Array.isArray(notificationsOrUpdater) ? notificationsOrUpdater : []),
        })),
      addNotification: (notification) => set((state) => ({
        notifications: Array.isArray(state.notifications)
          ? [...state.notifications, notification]
          : [notification]
      })),
      markNotificationRead: (id) => set((state) => ({
        notifications: Array.isArray(state.notifications)
          ? state.notifications.map(notif =>
              notif.id === id ? { ...notif, isRead: true } : notif
            )
          : []
      })),
      setLoading: (loading) => set({ loading }),
    }),
    { name: 'dashboard-store' }
  )
);

// UI store
interface UIState {
  sidebarCollapsed: boolean;
  currentModal: string | null;
  theme: 'light' | 'dark';
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentModal: (modal: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        currentModal: null,
        theme: 'light',
        setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
        setCurrentModal: (currentModal) => set({ currentModal }),
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({ 
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      }
    ),
    { name: 'ui-store' }
  )
);
