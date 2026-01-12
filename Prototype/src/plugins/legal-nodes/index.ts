// 法律节点插件入口文件

// 类型定义
export * from './types';

// 引擎
export * from './engines/legal-node-engine';

// 组件
export * from './components/LegalNodeComponent';

// 插件
export * from './with-legal-nodes';

// 默认配置
import { LegalWorkspaceConfig, LegalNodeTypes } from './types';

export const defaultLegalWorkspaceConfig: LegalWorkspaceConfig = {
  theme: {
    primaryColor: '#FF6B35',
    secondaryColor: '#FFF4F1',
    accentColor: '#E55A2B'
  },
  nodeDefaults: {
    [LegalNodeTypes.case]: {
      fill: '#e3f2fd',
      strokeColor: '#1976d2',
      strokeWidth: 2,
      opacity: 1
    },
    [LegalNodeTypes.person]: {
      fill: '#e8f5e8',
      strokeColor: '#4caf50',
      strokeWidth: 2,
      opacity: 1
    },
    [LegalNodeTypes.document]: {
      fill: '#fff3e0',
      strokeColor: '#ff9800',
      strokeWidth: 2,
      opacity: 1
    },
    [LegalNodeTypes.timeline]: {
      fill: '#f3e5f5',
      strokeColor: '#9c27b0',
      strokeWidth: 2,
      opacity: 1
    },
    [LegalNodeTypes.process]: {
      fill: '#ffebee',
      strokeColor: '#f44336',
      strokeWidth: 2,
      opacity: 1
    },
    [LegalNodeTypes.aiAssistant]: {
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      strokeColor: '#5e72e4',
      strokeWidth: 2,
      opacity: 1
    }
  },
  connectionDefaults: {
    connectionType: 'related-to',
    strength: 'medium',
    bidirectional: false
  },
  aiSettings: {
    enabled: true,
    autoSuggestions: true,
    language: 'zh-CN'
  }
};

// 工具函数
export const createLegalWorkspace = (config?: Partial<LegalWorkspaceConfig>) => {
  return {
    ...defaultLegalWorkspaceConfig,
    ...config
  };
};
