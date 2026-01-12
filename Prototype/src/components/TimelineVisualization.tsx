/**
 * LegalMind 法律工作台 - 时间轴可视化组件
 * 
 * 提供案件时间轴的可视化展示和交互编辑功能
 */

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  Circle,

} from 'lucide-react'

// ==================== 类型定义 ====================

interface TimelineEvent {
  id: string
  title: string
  description: string
  date: Date
  type: 'milestone' | 'deadline' | 'hearing' | 'filing' | 'notification' | 'other'
  status: 'completed' | 'pending' | 'overdue' | 'cancelled'
  importance: 'low' | 'medium' | 'high' | 'critical'
  participants?: string[]
  documents?: string[]
  location?: string
  metadata?: any
}

interface TimelineVisualizationProps {
  events: TimelineEvent[]
  onEventAdd?: (event: Omit<TimelineEvent, 'id'>) => void
  onEventEdit?: (eventId: string, updates: Partial<TimelineEvent>) => void
  onEventDelete?: (eventId: string) => void
  onEventClick?: (event: TimelineEvent) => void
  className?: string
  readOnly?: boolean
}

// ==================== 事件类型配置 ====================

const EVENT_TYPES = {
  milestone: {
    label: '里程碑',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  deadline: {
    label: '截止日期',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  hearing: {
    label: '庭审',
    icon: <Calendar className="w-4 h-4" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  filing: {
    label: '立案',
    icon: <Circle className="w-4 h-4" />,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  notification: {
    label: '通知',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  other: {
    label: '其他',
    icon: <Circle className="w-4 h-4" />,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
}

const IMPORTANCE_LEVELS = {
  low: { label: '低', color: 'text-gray-500' },
  medium: { label: '中', color: 'text-blue-500' },
  high: { label: '高', color: 'text-orange-500' },
  critical: { label: '紧急', color: 'text-red-500' }
}

// ==================== 主组件 ====================

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({
  events,

  onEventDelete,
  onEventClick,
  className = '',
  readOnly = false
}) => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'list'>('timeline')
  const [sortedEvents, setSortedEvents] = useState<TimelineEvent[]>([])

  // ==================== 事件排序和过滤 ====================

  useEffect(() => {
    const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime())
    setSortedEvents(sorted)
  }, [events])

  // ==================== 事件处理 ====================

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event)
    onEventClick?.(event)
  }

  const handleAddEvent = () => {
    // TODO: Implement add event logic
    console.log('Add event clicked')
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEventStatus = (event: TimelineEvent) => {
    const now = new Date()
    if (event.status === 'completed') return 'completed'
    if (event.status === 'cancelled') return 'cancelled'
    if (event.date < now) return 'overdue'
    return 'pending'
  }

  // ==================== 渲染时间轴视图 ====================

  const renderTimelineView = () => {
    return (
      <div className="relative">
        {/* 时间轴主线 */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>

        <div className="space-y-6">
          {sortedEvents.map((event) => {
            const eventType = EVENT_TYPES[event.type]
            const status = getEventStatus(event)
            const importance = IMPORTANCE_LEVELS[event.importance]

            return (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* 时间轴节点 */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${status === 'completed' ? 'bg-green-500 border-green-500' :
                  status === 'overdue' ? 'bg-red-500 border-red-500' :
                    status === 'cancelled' ? 'bg-gray-400 border-gray-400' :
                      'bg-white border-gray-300'
                  }`}>
                  <div className={`text-white ${status === 'pending' ? 'text-gray-400' : ''}`}>
                    {eventType.icon}
                  </div>
                </div>

                {/* 事件卡片 */}
                <div
                  className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${eventType.bgColor
                    } ${eventType.borderColor} ${selectedEvent?.id === event.id ? 'ring-2 ring-orange-500' : ''
                    }`}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full bg-white ${importance.color}`}>
                        {importance.label}
                      </span>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // 编辑事件
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventDelete?.(event.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(event.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${status === 'completed' ? 'bg-green-100 text-green-700' :
                        status === 'overdue' ? 'bg-red-100 text-red-700' :
                          status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {status === 'completed' ? '已完成' :
                          status === 'overdue' ? '已逾期' :
                            status === 'cancelled' ? '已取消' : '待处理'}
                      </span>
                      <span className="text-gray-400">{eventType.label}</span>
                    </div>
                  </div>

                  {/* 参与者和文档 */}
                  {(event.participants?.length || event.documents?.length) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {event.participants?.length && (
                        <div className="mb-2">
                          <span className="text-xs text-gray-500">参与者：</span>
                          <span className="text-xs text-gray-700 ml-1">
                            {event.participants.join(', ')}
                          </span>
                        </div>
                      )}
                      {event.documents?.length && (
                        <div>
                          <span className="text-xs text-gray-500">相关文档：</span>
                          <span className="text-xs text-gray-700 ml-1">
                            {event.documents.length} 个文档
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 添加事件按钮 */}
        {!readOnly && (
          <div className="relative flex items-start gap-4 mt-6">
            <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-gray-300 bg-white">
              <Plus className="w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={handleAddEvent}
              className="flex-1 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              添加新事件
            </button>
          </div>
        )}
      </div>
    )
  }

  // ==================== 渲染列表视图 ====================

  const renderListView = () => {
    return (
      <div className="space-y-2">
        {sortedEvents.map((event) => {
          const eventType = EVENT_TYPES[event.type]
          const status = getEventStatus(event)
          const importance = IMPORTANCE_LEVELS[event.importance]

          return (
            <div
              key={event.id}
              className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${selectedEvent?.id === event.id ? 'ring-2 ring-orange-500' : ''
                }`}
              onClick={() => handleEventClick(event)}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${eventType.color} text-white`}>
                {eventType.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${importance.color}`}>
                    {importance.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{event.description}</p>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-900">{formatDate(event.date)}</div>
                <div className="text-xs text-gray-500">{formatTime(event.date)}</div>
              </div>

              <div className={`px-2 py-1 rounded-full text-xs ${status === 'completed' ? 'bg-green-100 text-green-700' :
                status === 'overdue' ? 'bg-red-100 text-red-700' :
                  status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                }`}>
                {status === 'completed' ? '已完成' :
                  status === 'overdue' ? '已逾期' :
                    status === 'cancelled' ? '已取消' : '待处理'}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ==================== 渲染 ====================

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">案件时间轴</h3>
          <span className="text-sm text-gray-500">
            {events.length} 个事件
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'timeline'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              时间轴
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'list'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              列表
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {viewMode === 'timeline' && renderTimelineView()}
        {viewMode === 'list' && renderListView()}

        {events.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无时间轴事件</h4>
            <p className="text-gray-500 mb-4">开始添加案件的重要时间节点</p>
            {!readOnly && (
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                添加第一个事件
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TimelineVisualization
