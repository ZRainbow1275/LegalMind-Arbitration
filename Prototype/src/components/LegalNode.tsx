import React, { useState, useCallback } from 'react'
import { FileText, MessageSquare, Video, Clock, Users, FileCheck, LayoutTemplate, CheckCircle } from 'lucide-react'
import { LegalNodeData } from '../types/legal-nodes'

interface LegalNodeProps {
  node: LegalNodeData
  position: { x: number; y: number }
  isSelected: boolean
  onClick: () => void
  onDoubleClick: () => void
  onDrag: (position: { x: number; y: number }) => void
}

const LegalNode: React.FC<LegalNodeProps> = ({
  node,
  position,
  isSelected,
  onClick,
  onDoubleClick,
  onDrag
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    onClick()
  }, [position, onClick])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }
      onDrag(newPosition)
    }
  }, [isDragging, dragStart, onDrag])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 获取节点图标
  const getNodeIcon = () => {
    const iconProps = { size: 16, className: 'node-icon' }

    switch (node.type) {
      case 'document':
        return <FileText {...iconProps} />
      case 'ai-chat':
        return <MessageSquare {...iconProps} />
      case 'hearing':
        return <Video {...iconProps} />
      case 'timeline':
        return <Clock {...iconProps} />
      case 'collaboration':
        return <Users {...iconProps} />
      case 'evidence':
        return <FileCheck {...iconProps} />
      case 'template':
        return <LayoutTemplate {...iconProps} />
      case 'review':
        return <CheckCircle {...iconProps} />
      default:
        return <FileText {...iconProps} />
    }
  }

  // 获取节点颜色主题
  const getNodeTheme = () => {
    const themes: Record<string, string> = {
      'document': 'document',
      'ai-chat': 'ai',
      'hearing': 'hearing',
      'timeline': 'timeline',
      'collaboration': 'collaboration',
      'evidence': 'document',
      'template': 'document',
      'review': 'collaboration',
      'hearing-preparation': 'hearing',
      'ai-assistant': 'ai',
      'hearing-process': 'hearing',
      'evidence-analysis': 'document',
      'decision-draft': 'document'
    }
    return themes[node.type] || 'document'
  }

  // 获取状态颜色
  const getStatusColor = () => {
    switch (node.status) {
      case 'completed':
        return '#27ae60'
      case 'in-progress':
        return '#f39c12'
      case 'error':
        return '#e74c3c'
      default:
        return '#bdc3c7'
    }
  }

  return (
    <div
      className={`legal-node ${getNodeTheme()} ${isSelected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        zIndex: isSelected ? 10 : 1,
        border: isSelected ? '2px solid #ff6b35' : undefined,
        boxShadow: isSelected
          ? '0 4px 20px rgba(255, 107, 53, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={onDoubleClick}
    >
      {/* 节点头部 */}
      <div className="node-header">
        <div className="node-icon-wrapper">
          {getNodeIcon()}
        </div>
        <div className="node-title">{node.title}</div>
        <div
          className="node-status"
          style={{ backgroundColor: getStatusColor() }}
          title={`状态: ${getStatusText(node.status)}`}
        />
      </div>

      {/* 节点内容 */}
      {node.description && (
        <div className="node-description">
          {node.description}
        </div>
      )}

      {/* 节点元数据 */}
      <div className="node-metadata">
        <div className="node-time">
          {formatTime(node.updatedAt)}
        </div>
        {node.caseId && (
          <div className="node-case">
            案件: {node.caseId}
          </div>
        )}
      </div>

      {/* 连接点 */}
      <div className="node-connection-points">
        <div className="connection-point input" title="输入连接点" />
        <div className="connection-point output" title="输出连接点" />
      </div>
    </div>
  )
}

// 辅助函数
function getStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    'pending': '待处理',
    'in-progress': '进行中',
    'completed': '已完成',
    'error': '错误'
  }
  return statusTexts[status] || status
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}

export default LegalNode
