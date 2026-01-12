import { LegalNode } from '../components/workspace/types';

// 数据存储键名
const STORAGE_KEYS = {
  WORKSPACE_NODES: 'legalmind_workspace_nodes',
  WORKSPACE_STATE: 'legalmind_workspace_state',
  USER_PREFERENCES: 'legalmind_user_preferences'
} as const;

// 工作区状态类型
export interface WorkspaceStorageState {
  nodes: LegalNode[];
  viewport: {
    zoom: number;
    x: number;
    y: number;
  };
  selectedNodes: string[];
  lastSaved: string;
  version: string;
}

// 用户偏好设置类型
export interface UserPreferences {
  autoSave: boolean;
  autoSaveInterval: number; // 秒
  theme: 'light' | 'dark';
  gridVisible: boolean;
  snapToGrid: boolean;
  defaultZoom: number;
}

// 默认用户偏好
const DEFAULT_PREFERENCES: UserPreferences = {
  autoSave: true,
  autoSaveInterval: 30,
  theme: 'light',
  gridVisible: true,
  snapToGrid: false,
  defaultZoom: 1
};

// 数据存储类
export class DataStorage {
  private static instance: DataStorage;

  private constructor() { }

  public static getInstance(): DataStorage {
    if (!DataStorage.instance) {
      DataStorage.instance = new DataStorage();
    }
    return DataStorage.instance;
  }

  // 保存工作区状态
  public saveWorkspaceState(state: WorkspaceStorageState): boolean {
    try {
      const stateWithTimestamp = {
        ...state,
        lastSaved: new Date().toISOString(),
        version: '1.0.0'
      };

      localStorage.setItem(
        STORAGE_KEYS.WORKSPACE_STATE,
        JSON.stringify(stateWithTimestamp)
      );


      return true;
    } catch (error) {
      console.error('保存工作区状态失败:', error);
      return false;
    }
  }

  // 加载工作区状态
  public loadWorkspaceState(): WorkspaceStorageState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORKSPACE_STATE);
      if (!stored) return null;

      const state = JSON.parse(stored) as WorkspaceStorageState;

      return state;
    } catch (error) {
      console.error('加载工作区状态失败:', error);
      return null;
    }
  }

  // 保存节点数据
  public saveNodes(nodes: LegalNode[]): boolean {
    try {
      const nodesWithTimestamp = {
        nodes,
        savedAt: new Date().toISOString(),
        count: nodes.length
      };

      localStorage.setItem(
        STORAGE_KEYS.WORKSPACE_NODES,
        JSON.stringify(nodesWithTimestamp)
      );


      return true;
    } catch (error) {
      console.error('保存节点数据失败:', error);
      return false;
    }
  }

  // 加载节点数据
  public loadNodes(): LegalNode[] | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORKSPACE_NODES);
      if (!stored) return null;

      const data = JSON.parse(stored);

      return data.nodes as LegalNode[];
    } catch (error) {
      console.error('加载节点数据失败:', error);
      return null;
    }
  }

  // 保存用户偏好
  public saveUserPreferences(preferences: Partial<UserPreferences>): boolean {
    try {
      const currentPrefs = this.loadUserPreferences();
      const updatedPrefs = { ...currentPrefs, ...preferences };

      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(updatedPrefs)
      );


      return true;
    } catch (error) {
      console.error('保存用户偏好失败:', error);
      return false;
    }
  }

  // 加载用户偏好
  public loadUserPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!stored) return DEFAULT_PREFERENCES;

      const preferences = JSON.parse(stored) as UserPreferences;
      return { ...DEFAULT_PREFERENCES, ...preferences };
    } catch (error) {
      console.error('加载用户偏好失败:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  // 清除所有数据
  public clearAllData(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      return true;
    } catch (error) {
      console.error('清除数据失败:', error);
      return false;
    }
  }

  // 导出数据
  public exportData(): string {
    try {
      const data = {
        workspaceState: this.loadWorkspaceState(),
        nodes: this.loadNodes(),
        userPreferences: this.loadUserPreferences(),
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }

  // 导入数据
  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      if (data.workspaceState) {
        this.saveWorkspaceState(data.workspaceState);
      }

      if (data.nodes) {
        this.saveNodes(data.nodes);
      }

      if (data.userPreferences) {
        this.saveUserPreferences(data.userPreferences);
      }


      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  // 获取存储使用情况
  public getStorageUsage(): { used: number; total: number; percentage: number } {
    try {
      let used = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length;
        }
      });

      // 估算总可用空间（通常为5-10MB）
      const total = 5 * 1024 * 1024; // 5MB
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}

// 导出单例实例
export const dataStorage = DataStorage.getInstance();
