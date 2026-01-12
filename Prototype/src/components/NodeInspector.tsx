import React, { useState } from 'react'
import { Edit, Trash2, Save, FileText, MessageSquare, Video } from 'lucide-react'
import { LegalNodeData } from '../types/legal-nodes'
import { DraggablePanel } from './common/DraggablePanel'

interface NodeInspectorProps {
  node: LegalNodeData
  onUpdateNode: (nodeId: string, updates: Partial<LegalNodeData>) => void
  onDeleteNode: (nodeId: string) => void
  onClose: () => void
}

const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onUpdateNode,
  onDeleteNode,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedNode, setEditedNode] = useState(node)

  const handleSave = () => {
    onUpdateNode(node.id, {
      title: editedNode.title,
      description: editedNode.description,
      status: editedNode.status,
      updatedAt: new Date()
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedNode(node)
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (window.confirm('确定要删除这个节点吗？')) {
      onDeleteNode(node.id)
      onClose()
    }
  }

  const getNodeTypeIcon = () => {
    switch (node.type) {
      case 'document':
        return <FileText size={20} />
      case 'ai-chat':
        return <MessageSquare size={20} />
      case 'hearing':
        return <Video size={20} />
      default:
        return <FileText size={20} />
    }
  }

  const getNodeTypeName = () => {
    const typeNames = {
      'document': '法律文书',
      'ai-chat': 'AI 法律助手',
      'hearing': '庭审环节',
      'timeline': '时间节点',
      'collaboration': '协作讨论',
      'evidence': '证据材料',
      'template': '文书模板',
      'review': '审核流程',
      'hearing-preparation': '庭前准备',
      'case-info': '案件信息',
      'person': '人员信息',
      'fact': '事实认定',
      'issue': '争议焦点',
      'law': '法律适用',
      'analysis': '分析意见',
      'conclusion': '结论意见'
    }
    return typeNames[node.type as keyof typeof typeNames] || '未知类型'
  }

  return (
    <DraggablePanel
      title="节点属性"
      initialPosition={{ x: window.innerWidth - 340, y: 80 }}
      width={320}
      onClose={onClose}
      className="node-inspector-panel"
    >
      <div className="inspector-content p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
            {getNodeTypeIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">节点详情</h3>
            <span className="text-xs text-slate-500">{getNodeTypeName()}</span>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="inspector-section mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">基本信息</h4>

          <div className="form-group mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">节点标题</label>
            {isEditing ? (
              <input
                type="text"
                value={editedNode.title}
                onChange={(e) => setEditedNode({ ...editedNode, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            ) : (
              <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700">{node.title}</div>
            )}
          </div>

          <div className="form-group mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">描述</label>
            {isEditing ? (
              <textarea
                value={editedNode.description || ''}
                onChange={(e) => setEditedNode({ ...editedNode, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                rows={3}
              />
            ) : (
              <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-md text-sm text-slate-700 min-h-[60px]">{node.description || '暂无描述'}</div>
            )}
          </div>

          <div className="form-group mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">状态</label>
            {isEditing ? (
              <select
                value={editedNode.status}
                onChange={(e) => setEditedNode({ ...editedNode, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="pending">待处理</option>
                <option value="in-progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="error">错误</option>
              </select>
            ) : (
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${node.status === 'completed' ? 'bg-green-100 text-green-700' :
                  node.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    node.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'}`}>
                {getStatusText(node.status)}
              </div>
            )}
          </div>
        </div>

        {/* 业务数据 (Business Data) */}
        <div className="inspector-section mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">业务数据</h4>

          {/* 案件信息 (Case Info) */}
          {node.type === 'case-info' && (
            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">案号</label>
                <div className="text-sm text-slate-800 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  {node.metadata?.caseNumber || 'N/A'}
                </div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">争议金额</label>
                <div className="text-sm text-slate-800">
                  {node.metadata?.disputeAmount ? `¥${node.metadata.disputeAmount.toLocaleString()}` : 'N/A'}
                </div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">申请人</label>
                <div className="text-sm text-slate-800">{node.metadata?.applicant || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">被申请人</label>
                <div className="text-sm text-slate-800">{node.metadata?.respondent || 'N/A'}</div>
              </div>
            </div>
          )}

          {/* 证据材料 (Evidence) */}
          {node.type === 'evidence' && (
            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">文件名称</label>
                <div className="text-sm text-slate-800 break-all">{node.metadata?.fileName || node.title}</div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">证据分类</label>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                  {node.metadata?.category || '未分类'}
                </div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">上传时间</label>
                <div className="text-sm text-slate-500">
                  {node.metadata?.uploadedAt ? new Date(node.metadata.uploadedAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* 人员信息 (Person) */}
          {(node.type === 'person' || node.type === 'arbitrator') && (
            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">姓名</label>
                <div className="text-sm font-medium text-slate-800">{node.metadata?.name || node.title}</div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">头衔/职务</label>
                <div className="text-sm text-slate-600">{node.metadata?.title || 'N/A'}</div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">专业领域</label>
                <div className="flex flex-wrap gap-1">
                  {node.metadata?.specialties?.map((s: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-100">
                      {s}
                    </span>
                  )) || <span className="text-slate-400 text-xs">无</span>}
                </div>
              </div>
            </div>
          )}

          {/* 文书信息 (Document) */}
          {node.type === 'document' && (
            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">版本</label>
                <div className="text-sm text-slate-800">v1.0</div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">审核人</label>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] text-blue-600">王</div>
                  <div className="w-6 h-6 rounded-full bg-green-100 border border-white flex items-center justify-center text-[10px] text-green-600">李</div>
                </div>
              </div>
            </div>
          )}

          {/* AI对话信息 (AI Chat) */}
          {node.type === 'ai-chat' && (
            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">对话记录</label>
                <div className="text-sm text-slate-800">5 条消息</div>
              </div>
            </div>
          )}

          {/* 庭审信息 (Hearing) */}
          {node.type === 'hearing' && (
            <div className="space-y-3">
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">庭审类型</label>
                <div className="text-sm text-slate-800">在线庭审</div>
              </div>
              <div className="form-group">
                <label className="block text-xs font-medium text-slate-600 mb-1">预定时间</label>
                <div className="text-sm text-slate-800">2024-01-15 14:00</div>
              </div>
            </div>
          )}

          {/* 默认显示 Metadata JSON (调试用) */}
          {!['case-info', 'evidence', 'person', 'arbitrator', 'document', 'ai-chat', 'hearing'].includes(node.type) && node.metadata && (
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <pre className="text-[10px] text-slate-500 overflow-x-auto">
                {JSON.stringify(node.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>


        {/* 元数据 */}
        <div className="inspector-section mb-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">元数据</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-xs font-medium text-slate-600 mb-1">节点ID</label>
              <div className="font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate" title={node.id}>{node.id}</div>
            </div>

            <div className="form-group">
              <label className="block text-xs font-medium text-slate-600 mb-1">节点类型</label>
              <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">{node.type}</div>
            </div>
          </div>

          {node.caseId && (
            <div className="form-group mt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">关联案件</label>
              <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">{node.caseId}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="form-group">
              <label className="block text-xs font-medium text-slate-600 mb-1">创建时间</label>
              <div className="text-xs text-slate-500">{formatDateTime(node.createdAt)}</div>
            </div>

            <div className="form-group">
              <label className="block text-xs font-medium text-slate-600 mb-1">更新时间</label>
              <div className="text-xs text-slate-500">{formatDateTime(node.updatedAt)}</div>
            </div>
          </div>
        </div>

        {/* 特定类型的属性 - 已内联到上方 */}
      </div>

      <div className="inspector-actions p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
        {isEditing ? (
          <>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors shadow-sm"
              onClick={handleSave}
            >
              <Save size={14} />
              保存
            </button>
          </>
        ) : (
          <>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-md text-sm hover:bg-red-50 transition-colors"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
              删除
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-sm hover:bg-slate-50 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              <Edit size={14} />
              编辑
            </button>
          </>
        )}
      </div>
    </DraggablePanel>
  )
}

// 辅助函数
function getStatusText(status: string): string {
  const statusTexts = {
    'pending': '待处理',
    'in-progress': '进行中',
    'completed': '已完成',
    'error': '错误'
  }
  return statusTexts[status as keyof typeof statusTexts] || status
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default NodeInspector
