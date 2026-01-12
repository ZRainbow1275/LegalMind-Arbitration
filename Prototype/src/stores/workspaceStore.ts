import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { LegalNodeData, NodeConnection, WorkspaceState } from '../types/legal-nodes'

// 工作流模板定义
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'arbitration' | 'litigation' | 'contract' | 'ip' | 'custom'
  nodes: Omit<LegalNodeData, 'id' | 'createdAt' | 'updatedAt'>[]
  connections: Omit<NodeConnection, 'id'>[]
  estimatedDuration: number // 预计完成时间（天）
  complexity: 'simple' | 'medium' | 'complex'
  tags: string[]
}

// 用户设置
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  autoSave: boolean
  notifications: {
    email: boolean
    browser: boolean
    deadline: boolean
    collaboration: boolean
  }
  workspace: {
    gridSize: number
    snapToGrid: boolean
    showMinimap: boolean
    defaultZoom: number
  }
}

// 协作状态
export interface CollaborationState {
  activeUsers: Array<{
    id: string
    name: string
    avatar?: string
    cursor?: { x: number; y: number }
    selectedNodeId?: string
  }>
  comments: Array<{
    id: string
    nodeId: string
    userId: string
    content: string
    timestamp: Date
    resolved: boolean
  }>
  notifications: Array<{
    id: string
    type: 'mention' | 'comment' | 'deadline' | 'approval'
    message: string
    timestamp: Date
    read: boolean
  }>
}

// 主要的工作台状态接口
export interface WorkspaceStore extends WorkspaceState {
  // 基础状态
  isLoading: boolean
  error: string | null

  // 模板相关
  templates: WorkflowTemplate[]
  activeTemplateId: string | null

  // 用户设置
  userSettings: UserSettings

  // 协作状态
  collaboration: CollaborationState

  // 操作历史
  history: Array<{
    id: string
    action: string
    timestamp: Date
    data: any
  }>
  historyIndex: number

  // Actions - 节点操作
  addNode: (node: Omit<LegalNodeData, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateNode: (nodeId: string, updates: Partial<LegalNodeData>) => void
  deleteNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void

  // Actions - 连接操作
  addConnection: (connection: Omit<NodeConnection, 'id'>) => void
  updateConnection: (connectionId: string, updates: Partial<NodeConnection>) => void
  deleteConnection: (connectionId: string) => void

  // Actions - 工作台操作
  setSelectedNode: (nodeId: string | undefined) => void
  setViewMode: (mode: 'canvas' | 'timeline' | 'list') => void
  setZoomLevel: (zoom: number) => void
  setPanOffset: (offset: { x: number; y: number }) => void

  // Actions - 模板操作
  loadTemplate: (templateId: string) => void
  saveAsTemplate: (template: Omit<WorkflowTemplate, 'id'>) => void
  updateTemplate: (templateId: string, updates: Partial<Omit<WorkflowTemplate, 'id'>>) => void
  deleteTemplate: (templateId: string) => void

  // Actions - 历史操作
  undo: () => void
  redo: () => void
  clearHistory: () => void

  // Actions - 设置操作
  updateUserSettings: (settings: Partial<UserSettings>) => void

  // Actions - 协作操作
  addComment: (nodeId: string, content: string) => void
  resolveComment: (commentId: string) => void
  addNotification: (notification: Omit<CollaborationState['notifications'][0], 'id' | 'timestamp'>) => void
  markNotificationRead: (notificationId: string) => void

  // Actions - 数据操作
  exportWorkspace: () => string
  importWorkspace: (data: string) => void
  resetWorkspace: () => void
}

// 默认用户设置
const defaultUserSettings: UserSettings = {
  theme: 'light',
  language: 'zh-CN',
  autoSave: true,
  notifications: {
    email: true,
    browser: true,
    deadline: true,
    collaboration: true
  },
  workspace: {
    gridSize: 20,
    snapToGrid: true,
    showMinimap: true,
    defaultZoom: 1
  }
}

// 默认协作状态
const defaultCollaboration: CollaborationState = {
  activeUsers: [],
  comments: [],
  notifications: []
}

// 预定义工作流模板
const defaultTemplates: WorkflowTemplate[] = [
  {
    id: 'arbitration-standard',
    name: '标准商事仲裁流程',
    description: '适用于一般商事争议的标准仲裁流程',
    category: 'arbitration',
    complexity: 'medium',
    estimatedDuration: 90,
    tags: ['商事仲裁', '标准流程', '合同纠纷'],
    nodes: [
      {
        type: 'document',
        title: '仲裁申请书',
        description: '起草仲裁申请书',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'high', estimatedHours: 8 }
      },
      {
        type: 'ai-chat',
        title: '案件分析',
        description: 'AI辅助案件分析和策略制定',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'high', estimatedHours: 4 }
      },
      {
        type: 'timeline',
        title: '程序时间表',
        description: '制定仲裁程序时间安排',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'medium', estimatedHours: 2 }
      },
      {
        type: 'hearing',
        title: '庭审准备',
        description: '准备庭审材料和策略',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'high', estimatedHours: 16 }
      },
      {
        type: 'collaboration',
        title: '团队协作',
        description: '团队内部沟通和任务分配',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'medium', estimatedHours: 6 }
      }
    ],
    connections: [
      { sourceNodeId: '0', targetNodeId: '1', connectionType: 'workflow' },
      { sourceNodeId: '1', targetNodeId: '2', connectionType: 'workflow' },
      { sourceNodeId: '2', targetNodeId: '3', connectionType: 'workflow' },
      { sourceNodeId: '4', targetNodeId: '0', connectionType: 'collaboration' },
      { sourceNodeId: '4', targetNodeId: '3', connectionType: 'collaboration' }
    ]
  },
  {
    id: 'contract-dispute',
    name: '合同纠纷处理流程',
    description: '专门用于合同纠纷案件的处理流程',
    category: 'contract',
    complexity: 'medium',
    estimatedDuration: 60,
    tags: ['合同纠纷', '民商事', '调解'],
    nodes: [
      {
        type: 'document',
        title: '合同分析',
        description: '分析合同条款和争议点',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'high', estimatedHours: 6 }
      },
      {
        type: 'ai-chat',
        title: '争议识别',
        description: 'AI辅助识别争议焦点',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'high', estimatedHours: 3 }
      },
      {
        type: 'document',
        title: '证据梳理',
        description: '整理相关证据材料',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'high', estimatedHours: 8 }
      },
      {
        type: 'collaboration',
        title: '调解尝试',
        description: '尝试调解解决争议',
        status: 'pending',
        caseId: '',
        metadata: { priority: 'medium', estimatedHours: 4 }
      }
    ],
    connections: [
      { sourceNodeId: '0', targetNodeId: '1', connectionType: 'workflow' },
      { sourceNodeId: '1', targetNodeId: '2', connectionType: 'workflow' },
      { sourceNodeId: '2', targetNodeId: '3', connectionType: 'workflow' }
    ]
  }
]

// 创建Zustand store
export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态 - 加载演示数据
        nodes: [
          {
            id: 'demo-node-1',
            type: 'hearing-preparation',
            title: '庭审准备',
            description: '证据整理、争议焦点分析',
            status: 'pending',
            priority: 'high',
            assignedTo: 'AI助手',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            tags: ['准备阶段', '证据'],
            metadata: {
              position: { x: 100, y: 100 },
              color: '#3B82F6'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-node-2',
            type: 'ai-assistant',
            title: 'AI法律助手',
            description: '智能分析、文书生成',
            status: 'in-progress',
            priority: 'high',
            assignedTo: 'AI助手',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            tags: ['AI辅助', '分析'],
            metadata: {
              position: { x: 500, y: 100 },
              color: '#10B981'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-node-3',
            type: 'hearing-process',
            title: '庭审进行',
            description: '实时庭审、记录管理',
            status: 'pending',
            priority: 'medium',
            assignedTo: '仲裁员',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            tags: ['庭审', '实时'],
            metadata: {
              position: { x: 900, y: 100 },
              color: '#F59E0B'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-node-4',
            type: 'evidence-analysis',
            title: '证据分析',
            description: 'AI辅助证据审查',
            status: 'pending',
            priority: 'medium',
            assignedTo: 'AI助手',
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            tags: ['证据', 'AI分析'],
            metadata: {
              position: { x: 300, y: 350 },
              color: '#8B5CF6'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'demo-node-5',
            type: 'decision-draft',
            title: '裁决起草',
            description: 'AI辅助裁决书生成',
            status: 'pending',
            priority: 'high',
            assignedTo: '仲裁员',
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            tags: ['裁决', '文书'],
            metadata: {
              position: { x: 700, y: 350 },
              color: '#EF4444'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        connections: [
          {
            id: 'demo-conn-1',
            sourceNodeId: 'demo-node-1',
            targetNodeId: 'demo-node-2',
            connectionType: 'collaboration',
            label: '协作关联',
            metadata: {
              style: 'solid',
              animated: false
            }
          },
          {
            id: 'demo-conn-2',
            sourceNodeId: 'demo-node-2',
            targetNodeId: 'demo-node-3',
            connectionType: 'collaboration',
            label: '协作关联',
            metadata: {
              style: 'solid',
              animated: false
            }
          }
        ],
        selectedNodeId: undefined,
        viewMode: 'canvas',
        zoomLevel: 1,
        panOffset: { x: 0, y: 0 },
        isLoading: false,
        error: null,
        templates: defaultTemplates,
        activeTemplateId: null,
        userSettings: defaultUserSettings,
        collaboration: defaultCollaboration,
        history: [],
        historyIndex: -1,

        // 节点操作
        addNode: (nodeData) => {
          const newNode: LegalNodeData = {
            ...nodeData,
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }

          set((state) => ({
            nodes: [...state.nodes, newNode],
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              {
                id: `history-${Date.now()}`,
                action: 'ADD_NODE',
                timestamp: new Date(),
                data: newNode
              }
            ],
            historyIndex: state.historyIndex + 1
          }))
        },

        updateNode: (nodeId, updates) => {
          set((state) => ({
            nodes: state.nodes.map(node =>
              node.id === nodeId
                ? { ...node, ...updates, updatedAt: new Date() }
                : node
            ),
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              {
                id: `history-${Date.now()}`,
                action: 'UPDATE_NODE',
                timestamp: new Date(),
                data: { nodeId, updates }
              }
            ],
            historyIndex: state.historyIndex + 1
          }))
        },

        deleteNode: (nodeId) => {
          set((state) => ({
            nodes: state.nodes.filter(node => node.id !== nodeId),
            connections: state.connections.filter(
              conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
            ),
            selectedNodeId: state.selectedNodeId === nodeId ? undefined : state.selectedNodeId,
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              {
                id: `history-${Date.now()}`,
                action: 'DELETE_NODE',
                timestamp: new Date(),
                data: { nodeId }
              }
            ],
            historyIndex: state.historyIndex + 1
          }))
        },

        duplicateNode: (nodeId) => {
          const node = get().nodes.find(n => n.id === nodeId)
          if (node) {
            const duplicatedNode: LegalNodeData = {
              ...node,
              id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: `${node.title} (副本)`,
              createdAt: new Date(),
              updatedAt: new Date()
            }

            set((state) => ({
              nodes: [...state.nodes, duplicatedNode]
            }))
          }
        },

        // 连接操作
        addConnection: (connectionData) => {
          const newConnection: NodeConnection = {
            ...connectionData,
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }

          set((state) => ({
            connections: [...state.connections, newConnection]
          }))
        },

        updateConnection: (connectionId, updates) => {
          set((state) => ({
            connections: state.connections.map(conn =>
              conn.id === connectionId ? { ...conn, ...updates } : conn
            )
          }))
        },

        deleteConnection: (connectionId) => {
          set((state) => ({
            connections: state.connections.filter(conn => conn.id !== connectionId)
          }))
        },

        // 工作台操作
        setSelectedNode: (nodeId) => {
          set({ selectedNodeId: nodeId })
        },

        setViewMode: (mode) => {
          set({ viewMode: mode })
        },

        setZoomLevel: (zoom) => {
          set({ zoomLevel: Math.max(0.1, Math.min(3, zoom)) })
        },

        setPanOffset: (offset) => {
          set({ panOffset: offset })
        },

        // 模板操作
        loadTemplate: (templateId) => {
          const template = get().templates.find(t => t.id === templateId)
          if (template) {
            const nodes: LegalNodeData[] = template.nodes.map((nodeData, index) => ({
              ...nodeData,
              id: `node-${Date.now()}-${index}`,
              createdAt: new Date(),
              updatedAt: new Date()
            }))

            const connections: NodeConnection[] = template.connections.map((connData, index) => ({
              ...connData,
              id: `conn-${Date.now()}-${index}`,
              sourceNodeId: `node-${Date.now()}-${connData.sourceNodeId}`,
              targetNodeId: `node-${Date.now()}-${connData.targetNodeId}`
            }))

            set({
              nodes,
              connections,
              activeTemplateId: templateId,
              selectedNodeId: undefined
            })
          }
        },

        saveAsTemplate: (templateData) => {
          const newTemplate: WorkflowTemplate = {
            ...templateData,
            id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }

          set((state) => ({
            templates: [...state.templates, newTemplate]
          }))
        },

        updateTemplate: (templateId, updates) => {
          set((state) => ({
            templates: state.templates.map(t =>
              t.id === templateId ? { ...t, ...updates } : t
            )
          }))
        },

        deleteTemplate: (templateId) => {
          set((state) => ({
            templates: state.templates.filter(t => t.id !== templateId)
          }))
        },

        // 历史操作
        undo: () => {
          const state = get()
          if (state.historyIndex >= 0) {
            // const historyItem = state.history[state.historyIndex]
            // 这里可以实现具体的撤销逻辑
            set({ historyIndex: state.historyIndex - 1 })
          }
        },

        redo: () => {
          const state = get()
          if (state.historyIndex < state.history.length - 1) {
            // const historyItem = state.history[state.historyIndex + 1]
            // 这里可以实现具体的重做逻辑
            set({ historyIndex: state.historyIndex + 1 })
          }
        },

        clearHistory: () => {
          set({ history: [], historyIndex: -1 })
        },

        // 设置操作
        updateUserSettings: (settings) => {
          set((state) => ({
            userSettings: { ...state.userSettings, ...settings }
          }))
        },

        // 协作操作
        addComment: (nodeId, content) => {
          const newComment = {
            id: `comment-${Date.now()}`,
            nodeId,
            userId: 'current-user', // 这里应该从认证系统获取
            content,
            timestamp: new Date(),
            resolved: false
          }

          set((state) => ({
            collaboration: {
              ...state.collaboration,
              comments: [...state.collaboration.comments, newComment]
            }
          }))
        },

        resolveComment: (commentId) => {
          set((state) => ({
            collaboration: {
              ...state.collaboration,
              comments: state.collaboration.comments.map(comment =>
                comment.id === commentId ? { ...comment, resolved: true } : comment
              )
            }
          }))
        },

        addNotification: (notificationData) => {
          const newNotification = {
            ...notificationData,
            id: `notification-${Date.now()}`,
            timestamp: new Date(),
            read: false
          }

          set((state) => ({
            collaboration: {
              ...state.collaboration,
              notifications: [...state.collaboration.notifications, newNotification]
            }
          }))
        },

        markNotificationRead: (notificationId) => {
          set((state) => ({
            collaboration: {
              ...state.collaboration,
              notifications: state.collaboration.notifications.map(notification =>
                notification.id === notificationId ? { ...notification, read: true } : notification
              )
            }
          }))
        },

        // 数据操作
        exportWorkspace: () => {
          const state = get()
          return JSON.stringify({
            nodes: state.nodes,
            connections: state.connections,
            userSettings: state.userSettings,
            templates: state.templates.filter(t => t.category === 'custom')
          }, null, 2)
        },

        importWorkspace: (data) => {
          try {
            const imported = JSON.parse(data)
            set((state) => ({
              nodes: imported.nodes || [],
              connections: imported.connections || [],
              userSettings: { ...state.userSettings, ...imported.userSettings },
              templates: [
                ...state.templates.filter(t => t.category !== 'custom'),
                ...(imported.templates || [])
              ]
            }))
          } catch (error) {
            set({ error: '导入数据格式错误' })
          }
        },

        resetWorkspace: () => {
          set({
            nodes: [],
            connections: [],
            selectedNodeId: undefined,
            activeTemplateId: null,
            history: [],
            historyIndex: -1,
            error: null
          })
        }
      }),
      {
        name: 'legal-workspace-store',
        partialize: (state) => ({
          nodes: state.nodes,
          connections: state.connections,
          userSettings: state.userSettings,
          templates: state.templates.filter(t => t.category === 'custom')
        })
      }
    ),
    { name: 'legal-workspace' }
  )
)
