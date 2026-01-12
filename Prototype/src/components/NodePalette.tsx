import React from 'react'
import { FileText, MessageSquare, Video, Clock, Users, LayoutTemplate, CheckCircle, X } from 'lucide-react'
import { LegalNodeType } from '../types/legal-nodes'

interface NodePaletteProps {
  onCreateNode: (type: LegalNodeType, position: { x: number; y: number }) => void
  onClose: () => void
}

const NodePalette: React.FC<NodePaletteProps> = ({ onCreateNode, onClose }) => {
  const nodeTypes = [
    {
      type: 'document' as LegalNodeType,
      icon: FileText,
      title: '法律文书',
      description: '创建和编辑各类法律文书',
      color: '#3498db'
    },
    {
      type: 'ai-chat' as LegalNodeType,
      icon: MessageSquare,
      title: 'AI 法律助手',
      description: '与AI进行法律咨询和分析',
      color: '#27ae60'
    },
    {
      type: 'hearing' as LegalNodeType,
      icon: Video,
      title: '庭审环节',
      description: '庭审准备、进行和记录',
      color: '#e74c3c'
    },
    {
      type: 'timeline' as LegalNodeType,
      icon: Clock,
      title: '时间节点',
      description: '重要时间和里程碑管理',
      color: '#9b59b6'
    },
    {
      type: 'collaboration' as LegalNodeType,
      icon: Users,
      title: '协作讨论',
      description: '多方协作和沟通',
      color: '#f39c12'
    },
    {
      type: 'evidence' as LegalNodeType,
      icon: FileText,
      title: '证据材料',
      description: '证据收集和分析',
      color: '#34495e'
    },
    {
      type: 'template' as LegalNodeType,
      icon: LayoutTemplate,
      title: '文书模板',
      description: '标准文书模板库',
      color: '#16a085'
    },
    {
      type: 'review' as LegalNodeType,
      icon: CheckCircle,
      title: '审核流程',
      description: '文书审核和批准流程',
      color: '#8e44ad'
    }
  ]

  const handleNodeClick = (type: LegalNodeType) => {
    // 在画布中心创建节点
    const centerPosition = { x: 400, y: 300 }
    onCreateNode(type, centerPosition)
  }

  return (
    <div className="node-palette">
      <div className="palette-header">
        <h3>节点工具箱</h3>
        <button className="close-button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="palette-content">
        <div className="palette-section">
          <h4>核心节点</h4>
          <div className="node-grid">
            {nodeTypes.slice(0, 3).map(nodeType => (
              <NodePaletteItem
                key={nodeType.type}
                nodeType={nodeType}
                onClick={() => handleNodeClick(nodeType.type)}
              />
            ))}
          </div>
        </div>

        <div className="palette-section">
          <h4>辅助节点</h4>
          <div className="node-grid">
            {nodeTypes.slice(3, 6).map(nodeType => (
              <NodePaletteItem
                key={nodeType.type}
                nodeType={nodeType}
                onClick={() => handleNodeClick(nodeType.type)}
              />
            ))}
          </div>
        </div>

        <div className="palette-section">
          <h4>管理节点</h4>
          <div className="node-grid">
            {nodeTypes.slice(6).map(nodeType => (
              <NodePaletteItem
                key={nodeType.type}
                nodeType={nodeType}
                onClick={() => handleNodeClick(nodeType.type)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="palette-footer">
        <div className="usage-tip">
          <p>💡 提示：点击节点类型在画布中创建新节点</p>
        </div>
      </div>
    </div>
  )
}

interface NodePaletteItemProps {
  nodeType: {
    type: LegalNodeType
    icon: React.ComponentType<any>
    title: string
    description: string
    color: string
  }
  onClick: () => void
}

const NodePaletteItem: React.FC<NodePaletteItemProps> = ({ nodeType, onClick }) => {
  const Icon = nodeType.icon

  return (
    <div
      className="palette-item"
      onClick={onClick}
      style={{ borderLeftColor: nodeType.color }}
    >
      <div className="palette-item-icon" style={{ color: nodeType.color }}>
        <Icon size={20} />
      </div>
      <div className="palette-item-content">
        <div className="palette-item-title">{nodeType.title}</div>
        <div className="palette-item-description">{nodeType.description}</div>
      </div>
    </div>
  )
}

export default NodePalette
