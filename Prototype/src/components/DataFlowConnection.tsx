import React, { useState, useEffect } from 'react'
import { NodeConnection } from '../types/legal-nodes'

interface DataFlowConnectionProps {
  connection: NodeConnection
  sourcePosition: { x: number; y: number }
  targetPosition: { x: number; y: number }
  isActive?: boolean
  onHover?: (connection: NodeConnection | null) => void
  onClick?: (connection: NodeConnection) => void
}

interface DataPacket {
  id: string
  type: 'document' | 'analysis' | 'decision' | 'timeline' | 'collaboration'
  progress: number
  content: string
}

const DataFlowConnection: React.FC<DataFlowConnectionProps> = ({
  connection,
  sourcePosition,
  targetPosition,
  isActive = false,
  onHover,
  onClick
}) => {
  const [dataPackets, setDataPackets] = useState<DataPacket[]>([])
  const [isHovered, setIsHovered] = useState(false)

  // 模拟数据流动
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        const newPacket: DataPacket = {
          id: Date.now().toString(),
          type: getDataTypeFromConnection(connection.connectionType),
          progress: 0,
          content: getDataContent(connection.connectionType)
        }

        setDataPackets(prev => [...prev, newPacket])

        // 动画数据包移动
        const animatePacket = () => {
          setDataPackets(prev =>
            prev.map(packet =>
              packet.id === newPacket.id
                ? { ...packet, progress: Math.min(packet.progress + 2, 100) }
                : packet
            )
          )

          if (newPacket.progress < 100) {
            requestAnimationFrame(animatePacket)
          } else {
            // 移除完成的数据包
            setTimeout(() => {
              setDataPackets(prev => prev.filter(p => p.id !== newPacket.id))
            }, 500)
          }
        }

        requestAnimationFrame(animatePacket)
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [isActive, connection.connectionType])

  // 根据连接类型获取数据类型
  const getDataTypeFromConnection = (connectionType: string): DataPacket['type'] => {
    switch (connectionType) {
      case 'workflow':
        return 'document'
      case 'collaboration':
        return 'collaboration'
      case 'dependency':
        return 'analysis'
      case 'reference':
        return 'decision'
      default:
        return 'document'
    }
  }

  // 获取数据内容描述
  const getDataContent = (connectionType: string): string => {
    const contents = {
      'workflow': '工作流数据：文档、分析结果',
      'collaboration': '协作数据：评论、讨论',
      'dependency': '依赖数据：前置条件、要求',
      'reference': '引用数据：相关信息、参考'
    }
    return (contents as any)[connectionType] || '数据传输'
  }

  // 获取数据包颜色
  const getDataPacketColor = (type: DataPacket['type']) => {
    const colors = {
      'document': '#3b82f6', // blue
      'analysis': '#10b981', // emerald
      'decision': '#f59e0b', // amber
      'timeline': '#8b5cf6', // violet
      'collaboration': '#06b6d4' // cyan
    }
    return colors[type] || colors['document']
  }

  // 计算连接线路径 - 优化美观度
  const calculatePath = () => {
    // 节点的输出点（右侧中心）
    const startX = sourcePosition.x + 280 // 节点宽度
    const startY = sourcePosition.y + 80  // 节点高度的一半

    // 节点的输入点（左侧中心）
    const endX = targetPosition.x
    const endY = targetPosition.y + 80

    // 计算距离和方向
    const deltaX = endX - startX
    const deltaY = endY - startY
    // const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) // Unused

    // 动态调整控制点，让连接线更自然
    const minOffset = 80  // 最小控制点偏移
    const maxOffset = 200 // 最大控制点偏移
    const controlOffset = Math.min(maxOffset, Math.max(minOffset, Math.abs(deltaX) * 0.6))

    // 根据垂直距离调整控制点的垂直偏移
    const verticalInfluence = Math.min(50, Math.abs(deltaY) * 0.2)

    const controlX1 = startX + controlOffset
    const controlY1 = startY + (deltaY > 0 ? verticalInfluence : -verticalInfluence) * 0.3
    const controlX2 = endX - controlOffset
    const controlY2 = endY + (deltaY > 0 ? -verticalInfluence : verticalInfluence) * 0.3

    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`
  }

  // 计算数据包位置 - 修复坐标计算
  const calculatePacketPosition = (progress: number) => {
    const startX = sourcePosition.x + 280
    const startY = sourcePosition.y + 80
    const endX = targetPosition.x
    const endY = targetPosition.y + 80

    const t = progress / 100
    const x = startX + (endX - startX) * t
    const y = startY + (endY - startY) * t

    return { x, y }
  }

  const path = calculatePath()

  return (
    <g>
      {/* 简洁连接线 - 体现开放式人机互动 */}
      <defs>
        <linearGradient id={`connectionGradient-${connection.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#FF6B35" stopOpacity="1" />
          <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* 连接线阴影 - 轻微立体感 */}
      <path
        d={path}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="6"
        fill="none"
        className="opacity-100"
        transform="translate(1,1)"
      />

      {/* 主连接线 - 简洁优雅 */}
      <path
        d={path}
        stroke="#FF6B35"
        strokeWidth="4"
        fill="none"
        className="opacity-90"
        style={{
          filter: 'drop-shadow(0 2px 6px rgba(255, 107, 53, 0.3))'
        }}
        onMouseEnter={() => {
          setIsHovered(true)
          onHover?.(connection)
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          onHover?.(null)
        }}
        onClick={() => onClick?.(connection)}
      />

      {/* 悬停时的高亮效果 */}
      {isHovered && (
        <path
          d={path}
          stroke={`url(#connectionGradient-${connection.id})`}
          strokeWidth="8"
          fill="none"
          className="opacity-60"
          style={{
            filter: 'drop-shadow(0 0 12px rgba(255, 107, 53, 0.6))'
          }}
        />
      )}

      {/* 连接点标识 - 起点和终点的小圆点 */}
      <circle
        cx={sourcePosition.x + 280}
        cy={sourcePosition.y + 80}
        r="3"
        fill="#FF6B35"
        className="opacity-80"
      />
      <circle
        cx={targetPosition.x}
        cy={targetPosition.y + 80}
        r="3"
        fill="#FF6B35"
        className="opacity-80"
      />

      {/* 现代化数据流动效果 */}
      {dataPackets.map(packet => {
        const position = calculatePacketPosition(packet.progress)
        const packetColor = getDataPacketColor(packet.type)
        return (
          <g key={packet.id}>
            {/* 数据包轨迹 */}
            <circle
              cx={position.x}
              cy={position.y}
              r="12"
              fill={packetColor}
              opacity="0.1"
              className="animate-ping"
            />
            {/* 数据包外圈光晕 */}
            <circle
              cx={position.x}
              cy={position.y}
              r="8"
              fill={packetColor}
              opacity="0.4"
              className="animate-pulse"
            />
            {/* 数据包核心 */}
            <circle
              cx={position.x}
              cy={position.y}
              r="5"
              fill={packetColor}
              className="drop-shadow-lg"
              style={{
                filter: `drop-shadow(0 0 6px ${packetColor})`
              }}
            />
            {/* 数据包内核 */}
            <circle
              cx={position.x}
              cy={position.y}
              r="2"
              fill="white"
              opacity="0.9"
            />
          </g>
        )
      })}

      {/* 连接信息提示 */}
      {isHovered && (
        <foreignObject
          x={sourcePosition.x + (targetPosition.x - sourcePosition.x) / 2 - 75}
          y={sourcePosition.y + (targetPosition.y - sourcePosition.y) / 2 - 40}
          width="150"
          height="80"
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
            <div className="font-medium text-gray-900 mb-1">
              {connection.connectionType === 'workflow' && '工作流连接'}
              {connection.connectionType === 'collaboration' && '协作连接'}
              {connection.connectionType === 'dependency' && '依赖连接'}
              {connection.connectionType === 'reference' && '引用连接'}
            </div>
            <div className="text-gray-600">
              {getDataContent(connection.connectionType)}
            </div>
            {connection.label && (
              <div className="text-gray-500 mt-1 italic">
                {connection.label}
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export default DataFlowConnection
