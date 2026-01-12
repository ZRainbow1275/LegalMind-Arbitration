import { useState, useCallback, useEffect } from 'react'
import { LegalNodeData, NodeConnection, WorkspaceState } from '../types/legal-nodes'

// 生成唯一ID
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// 创建示例数据
function createSampleWorkspace(): WorkspaceState {
  const sampleNodes: LegalNodeData[] = [
    {
      id: 'node-1',
      type: 'document',
      title: '仲裁申请书',
      description: '商事争议仲裁申请书起草',
      status: 'completed',
      caseId: 'CASE-2024-001',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-12')
    },
    {
      id: 'node-2',
      type: 'ai-chat',
      title: 'AI 法律咨询',
      description: '关于合同争议的法律分析',
      status: 'in-progress',
      caseId: 'CASE-2024-001',
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-13')
    },
    {
      id: 'node-3',
      type: 'hearing',
      title: '庭审准备',
      description: '第一次庭审准备工作',
      status: 'pending',
      caseId: 'CASE-2024-001',
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13')
    },
    {
      id: 'node-4',
      type: 'evidence',
      title: '证据收集',
      description: '收集相关合同和往来邮件',
      status: 'completed',
      caseId: 'CASE-2024-001',
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-10')
    }
  ]

  const sampleConnections: NodeConnection[] = [
    {
      id: 'conn-1',
      sourceNodeId: 'node-4',
      targetNodeId: 'node-1',
      connectionType: 'workflow',
      label: '基于证据起草'
    },
    {
      id: 'conn-2',
      sourceNodeId: 'node-1',
      targetNodeId: 'node-2',
      connectionType: 'workflow',
      label: 'AI 分析'
    },
    {
      id: 'conn-3',
      sourceNodeId: 'node-2',
      targetNodeId: 'node-3',
      connectionType: 'workflow',
      label: '准备庭审'
    }
  ]

  return {
    nodes: sampleNodes,
    connections: sampleConnections,
    selectedNodeId: undefined,
    viewMode: 'canvas',
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 }
  }
}

export function useLegalWorkspace() {
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => {
    // 尝试从本地存储加载
    const saved = localStorage.getItem('legal-workspace')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // 转换日期字符串回 Date 对象
        parsed.nodes = parsed.nodes.map((node: any) => ({
          ...node,
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt)
        }))
        return parsed
      } catch (error) {
        console.warn('Failed to load workspace from localStorage:', error)
      }
    }
    return createSampleWorkspace()
  })

  // 自动保存到本地存储
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('legal-workspace', JSON.stringify(workspaceState))
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [workspaceState])

  // 获取选中的节点
  const selectedNode = workspaceState.selectedNodeId
    ? workspaceState.nodes.find(node => node.id === workspaceState.selectedNodeId)
    : undefined

  // 创建节点
  const createNode = useCallback((
    nodeData: Partial<LegalNodeData>
  ) => {
    const newNode: LegalNodeData = {
      id: generateId(),
      type: nodeData.type || 'document',
      title: nodeData.title || '新节点',
      description: nodeData.description,
      status: nodeData.status || 'pending',
      caseId: nodeData.caseId || 'CASE-2024-001',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: nodeData.metadata
    }

    setWorkspaceState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      selectedNodeId: newNode.id
    }))

    return newNode.id
  }, [])

  // 更新节点
  const updateNode = useCallback((nodeId: string, updates: Partial<LegalNodeData>) => {
    setWorkspaceState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId
          ? { ...node, ...updates, updatedAt: new Date() }
          : node
      )
    }))
  }, [])

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    setWorkspaceState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      ),
      selectedNodeId: prev.selectedNodeId === nodeId ? undefined : prev.selectedNodeId
    }))
  }, [])

  // 选择节点
  const selectNode = useCallback((nodeId: string | undefined) => {
    setWorkspaceState(prev => ({
      ...prev,
      selectedNodeId: nodeId
    }))
  }, [])

  // 连接节点
  const connectNodes = useCallback((sourceId: string, targetId: string, label?: string) => {
    const newConnection: NodeConnection = {
      id: generateId(),
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      connectionType: 'workflow',
      label
    }

    setWorkspaceState(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection]
    }))
  }, [])

  // 保存工作台
  const saveWorkspace = useCallback(() => {
    localStorage.setItem('legal-workspace', JSON.stringify(workspaceState))
    console.log('工作台已保存')
  }, [workspaceState])

  // 加载工作台
  const loadWorkspace = useCallback(() => {
    const saved = localStorage.getItem('legal-workspace')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        parsed.nodes = parsed.nodes.map((node: any) => ({
          ...node,
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt)
        }))
        setWorkspaceState(parsed)
        console.log('工作台已加载')
      } catch (error) {
        console.error('Failed to load workspace:', error)
      }
    }
  }, [])

  return {
    workspaceState,
    selectedNode,
    createNode,
    updateNode,
    deleteNode,
    selectNode,
    connectNodes,
    saveWorkspace,
    loadWorkspace
  }
}
