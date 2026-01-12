/**
 * LegalMind 法律工作台 - 文档管理组件
 * 
 * 提供案件文档的管理、预览和协作编辑功能
 */

import React, { useState, useRef } from 'react'
import { FileText, Upload, Filter, Search, Download, Trash2, Edit3, Share2, Lock, Grid, List, Clock, CheckCircle, XCircle, Star, StarOff } from 'lucide-react';

// ==================== 类型定义 ====================

export interface LegalDocument {
  id: string
  name: string
  type: 'evidence' | 'contract' | 'petition' | 'response' | 'ruling' | 'agreement' | 'other'
  size: number
  format: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png' | 'other'
  version: number
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'final'
  isConfidential: boolean
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  lastEditedBy?: string
  tags: string[]
  description?: string
  url?: string
  thumbnail?: string
  metadata?: any
}

interface DocumentManagerProps {
  documents: LegalDocument[]
  onDocumentAdd?: (document: Omit<LegalDocument, 'id'>) => void
  onDocumentEdit?: (documentId: string, updates: Partial<LegalDocument>) => void
  onDocumentDelete?: (documentId: string) => void
  onDocumentView?: (document: LegalDocument) => void
  onDocumentDownload?: (document: LegalDocument) => void
  onDocumentShare?: (document: LegalDocument) => void
  className?: string
  readOnly?: boolean
}

// ==================== 文档类型配置 ====================

const DOCUMENT_TYPES = {
  evidence: {
    label: '证据材料',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  contract: {
    label: '合同文件',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  petition: {
    label: '申请书',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  response: {
    label: '答辩书',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  ruling: {
    label: '裁决书',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  agreement: {
    label: '协议书',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  other: {
    label: '其他',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
}

const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Edit3 className="w-3 h-3" /> },
  review: { label: '审核中', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: <Clock className="w-3 h-3" /> },
  approved: { label: '已批准', color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: '已拒绝', color: 'text-red-600', bgColor: 'bg-red-100', icon: <XCircle className="w-3 h-3" /> },
  final: { label: '最终版', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <CheckCircle className="w-3 h-3" /> }
}

// ==================== 主组件 ====================

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onDocumentAdd,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentView,
  onDocumentDownload,
  onDocumentShare,
  className = '',
  readOnly = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==================== 文档过滤和排序 ====================

  const filteredAndSortedDocuments = React.useMemo(() => {
    const filtered = documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = selectedType === 'all' || doc.type === selectedType
      const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus

      return matchesSearch && matchesType && matchesStatus
    })

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [documents, searchTerm, selectedType, selectedStatus, sortBy, sortOrder])

  // ==================== 事件处理 ====================

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const newDocument: Omit<LegalDocument, 'id'> = {
        name: file.name,
        type: 'other',
        size: file.size,
        format: file.name.split('.').pop()?.toLowerCase() as any || 'other',
        version: 1,
        status: 'draft',
        isConfidential: false,
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '当前用户',
        tags: [],
        description: `上传的文件：${file.name}`
      }

      onDocumentAdd?.(newDocument)
    })

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDocumentSelect = (documentId: string, selected: boolean) => {
    if (selected) {
      setSelectedDocuments(prev => [...prev, documentId])
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // ==================== 渲染网格视图 ====================

  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAndSortedDocuments.map((document) => {
          const docType = DOCUMENT_TYPES[document.type]
          const statusConfig = STATUS_CONFIG[document.status]
          const isSelected = selectedDocuments.includes(document.id)

          return (
            <div
              key={document.id}
              className={`relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-orange-500 border-orange-200' : 'border-gray-200'
                } ${docType.bgColor}`}
              onClick={() => onDocumentView?.(document)}
            >
              {/* 选择框 */}
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleDocumentSelect(document.id, e.target.checked)
                  }}
                  className="absolute top-2 left-2 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
              )}

              {/* 收藏按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDocumentEdit?.(document.id, { isFavorite: !document.isFavorite })
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-yellow-500 transition-colors"
              >
                {document.isFavorite ? <Star className="w-4 h-4 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
              </button>

              {/* 文档图标 */}
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${docType.color} text-white`}>
                {docType.icon}
              </div>

              {/* 文档信息 */}
              <h4 className="font-medium text-gray-900 mb-1 truncate" title={document.name}>
                {document.name}
              </h4>

              <p className="text-sm text-gray-600 mb-2">{docType.label}</p>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{formatFileSize(document.size)}</span>
                <span>v{document.version}</span>
              </div>

              {/* 状态标签 */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>

              {/* 机密标识 */}
              {document.isConfidential && (
                <div className="absolute top-2 right-8 text-red-500">
                  <Lock className="w-3 h-3" />
                </div>
              )}

              {/* 操作按钮 */}
              {!readOnly && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentEdit?.(document.id, {})
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentShare?.(document)
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentDelete?.(document.id)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ==================== 渲染列表视图 ====================

  const renderListView = () => {
    return (
      <div className="space-y-2">
        {filteredAndSortedDocuments.map((document) => {
          const docType = DOCUMENT_TYPES[document.type]
          const statusConfig = STATUS_CONFIG[document.status]
          const isSelected = selectedDocuments.includes(document.id)

          return (
            <div
              key={document.id}
              className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${isSelected ? 'ring-2 ring-orange-500 border-orange-200' : 'border-gray-200'
                }`}
              onClick={() => onDocumentView?.(document)}
            >
              {/* 选择框 */}
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleDocumentSelect(document.id, e.target.checked)
                  }}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
              )}

              {/* 文档图标 */}
              <div className={`w-8 h-8 rounded flex items-center justify-center ${docType.color} text-white flex-shrink-0`}>
                {docType.icon}
              </div>

              {/* 文档信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">{document.name}</h4>
                  {document.isFavorite && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                  {document.isConfidential && <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{docType.label}</span>
                  <span>{formatFileSize(document.size)}</span>
                  <span>v{document.version}</span>
                  <span>由 {document.createdBy} 创建</span>
                </div>
              </div>

              {/* 状态和日期 */}
              <div className="text-right flex-shrink-0">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mb-1 ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(document.updatedAt)}
                </div>
              </div>

              {/* 操作按钮 */}
              {!readOnly && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentDownload?.(document)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentEdit?.(document.id, {})
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentShare?.(document)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDocumentDelete?.(document.id)
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ==================== 渲染 ====================

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-gray-900">文档管理</h3>
            <span className="text-sm text-gray-500">
              {filteredAndSortedDocuments.length} / {documents.length} 个文档
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 上传按钮 */}
            {!readOnly && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  上传文档
                </button>
              </>
            )}

            {/* 视图切换 */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 过滤器切换 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-gray-100 text-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文档名称、描述或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* 过滤器 */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文档类型</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">全部类型</option>
                {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">全部状态</option>
                {Object.entries(STATUS_CONFIG).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序方式</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="date">按日期</option>
                <option value="name">按名称</option>
                <option value="size">按大小</option>
                <option value="type">按类型</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序顺序</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
        )}

        {/* 批量操作 */}
        {selectedDocuments.length > 0 && !readOnly && (
          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <span className="text-sm text-orange-700">
              已选择 {selectedDocuments.length} 个文档
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  selectedDocuments.forEach(id => {
                    const doc = documents.find(d => d.id === id)
                    if (doc) onDocumentDownload?.(doc)
                  })
                }}
                className="px-3 py-1 text-sm text-orange-700 hover:text-orange-800 transition-colors"
              >
                批量下载
              </button>
              <button
                onClick={() => {
                  selectedDocuments.forEach(id => onDocumentDelete?.(id))
                  setSelectedDocuments([])
                }}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                批量删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {filteredAndSortedDocuments.length > 0 ? (
          <>
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'list' && renderListView()}
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {documents.length === 0 ? '暂无文档' : '没有找到匹配的文档'}
            </h4>
            <p className="text-gray-500 mb-4">
              {documents.length === 0 ? '开始上传案件相关文档' : '尝试调整搜索条件或过滤器'}
            </p>
            {!readOnly && documents.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                上传第一个文档
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentManager
