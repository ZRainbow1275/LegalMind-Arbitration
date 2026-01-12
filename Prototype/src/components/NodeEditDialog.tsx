import React, { useState, useEffect } from 'react'
import { X, Save, MessageSquare, FileText, Video, Clock, Users, Sparkles, Bot, Send } from 'lucide-react'
import { cn } from '../lib/utils'
import { LegalNodeData } from '../types/legal-nodes'

interface NodeEditDialogProps {
  node: LegalNodeData | null
  isOpen: boolean
  onClose: () => void
  onSave: (nodeId: string, updates: Partial<LegalNodeData>) => void
  onGenerateContent?: (content: { type: string; title: string; description: string }) => void
}

const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  onGenerateContent
}) => {
  const [editedNode, setEditedNode] = useState<Partial<LegalNodeData>>({})
  const [activeTab, setActiveTab] = useState<'content' | 'ai-chat'>('content')
  const [aiMessages, setAiMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>>([])
  const [aiInput, setAiInput] = useState('')

  useEffect(() => {
    if (node) {
      setEditedNode({
        title: node.title,
        description: node.description,
        status: node.status,
        metadata: node.metadata || {}
      })

      // 初始化AI对话历史
      setAiMessages([
        {
          id: '1',
          role: 'assistant',
          content: `您好！我是您的AI法律助手。我注意到您正在编辑"${node.title}"节点。我可以帮助您：\n\n• 📝 优化文档内容和结构\n• ⚖️ 提供法律条文建议\n• 🎯 制定工作策略\n• 📋 生成相关模板\n\n请告诉我您需要什么帮助？`,
          timestamp: new Date()
        }
      ])
    }
  }, [node])

  const getNodeIcon = () => {
    if (!node) return <FileText size={20} />

    const iconProps = { size: 20, className: 'text-primary' }
    switch (node.type) {
      case 'hearing-preparation':
        return <FileText {...iconProps} />
      case 'ai-assistant':
        return <MessageSquare {...iconProps} />
      case 'hearing-process':
        return <Video {...iconProps} />
      case 'evidence-analysis':
        return <Users {...iconProps} />
      case 'decision-draft':
        return <Clock {...iconProps} />
      default:
        return <FileText {...iconProps} />
    }
  }

  const getNodeTypeName = () => {
    if (!node) return '未知节点'

    const typeNames = {
      'hearing-preparation': '庭审准备',
      'ai-assistant': 'AI法律助手',
      'hearing-process': '庭审进行',
      'evidence-analysis': '证据分析',
      'decision-draft': '裁决起草'
    }
    return (typeNames as any)[node.type] || '未知类型'
  }

  const handleSave = () => {
    if (node && editedNode) {
      onSave(node.id, editedNode)
      onClose()
    }
  }

  const handleAiSend = () => {
    if (!aiInput.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: aiInput,
      timestamp: new Date()
    }

    setAiMessages(prev => [...prev, userMessage])
    setAiInput('')

    // 模拟AI回复和内容生成
    setTimeout(() => {
      const { response, generatedContent } = generateAiResponse(aiInput, node)

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      }
      setAiMessages(prev => [...prev, aiResponse])

      // 如果AI生成了新内容，添加到画布
      if (generatedContent && onGenerateContent) {
        onGenerateContent(generatedContent)
      }
    }, 1000)
  }

  const generateAiResponse = (input: string, node: LegalNodeData | null): { response: string; generatedContent?: { type: string; title: string; description: string } } => {
    if (!node) return { response: '抱歉，无法获取节点信息。' }

    // 检查是否需要生成新内容
    const shouldGenerateContent = input.includes('生成') || input.includes('创建') || input.includes('起草') || input.includes('制定')

    let generatedContent = undefined

    if (shouldGenerateContent) {
      // 根据节点类型和用户输入生成相应内容
      switch (node.type) {
        case 'hearing-preparation':
          generatedContent = {
            type: 'evidence-analysis',
            title: '证据清单分析',
            description: 'AI生成的证据材料分析和整理方案'
          }
          break
        case 'ai-assistant':
          if (input.includes('合同') || input.includes('起诉状')) {
            generatedContent = {
              type: 'decision-draft',
              title: '合同纠纷起诉状草案',
              description: 'AI智能生成的起诉状模板，包含完整法律结构'
            }
          }
          break
        case 'hearing-process':
          generatedContent = {
            type: 'evidence-analysis',
            title: '庭审要点总结',
            description: 'AI生成的庭审关键环节和注意事项'
          }
          break
        case 'evidence-analysis':
          generatedContent = {
            type: 'decision-draft',
            title: '证据分析报告',
            description: 'AI生成的证据效力分析和建议'
          }
          break
        case 'decision-draft':
          generatedContent = {
            type: 'hearing-preparation',
            title: '裁决执行方案',
            description: 'AI生成的裁决书执行建议和后续步骤'
          }
          break
      }
    }

    const responses = {
      'hearing-preparation': shouldGenerateContent
        ? `✅ **已为您生成证据清单分析**\n\n我已经在画布上创建了一个新的证据分析节点，包含：\n• 📋 证据材料分类整理\n• ⚖️ 证据效力评估\n• 🎯 证据链条分析\n• 📝 补强证据建议\n\n您可以点击新生成的节点查看详细内容。`
        : `庭审准备建议：\n\n⚖️ **庭审策略**：\n• 梳理争议焦点和核心证据\n• 准备质证和辩论要点\n• 制定庭审发言提纲\n\n🎯 **关键准备**：\n• 证据材料整理\n• 法条依据准备\n• 应对策略制定\n\n💡 **提示**：说"生成证据清单"我可以为您创建详细的证据分析节点。`,

      'ai-assistant': shouldGenerateContent
        ? `✅ **已为您生成合同纠纷起诉状草案**\n\n我已经在画布上创建了一个新的文书节点，包含：\n• 📝 完整的起诉状结构\n• ⚖️ 相关法条引用\n• 🎯 争议焦点梳理\n• 📋 证据清单模板\n\n您可以点击新生成的节点进行编辑和完善。`
        : `AI法律助手为您服务：\n\n🤖 **智能功能**：\n• 文书智能起草\n• 法条智能匹配\n• 案例智能检索\n• 策略智能建议\n\n💡 **快速生成**：\n• 说"生成起诉状"创建文书模板\n• 说"生成证据清单"整理证据材料\n• 说"生成庭审方案"制定策略\n\n请告诉我您需要生成什么内容？`,

      'hearing-process': shouldGenerateContent
        ? `✅ **已为您生成庭审要点总结**\n\n我已经在画布上创建了一个新的分析节点，包含：\n• 🎯 庭审关键环节\n• 📝 发言要点提纲\n• ⚖️ 质证策略建议\n• 🤝 和解谈判要点\n\n您可以点击新生成的节点查看详细庭审指导。`
        : `庭审进行指导：\n\n⚖️ **庭审流程**：\n• 开庭准备和程序确认\n• 当事人陈述和举证\n• 质证和辩论环节\n• 最后陈述和调解\n\n🎯 **关键技巧**：\n• 把握发言节奏\n• 突出核心争议\n• 有效质证反驳\n• 适时提出和解\n\n💡 **提示**：说"生成庭审要点"我可以为您创建详细的庭审指导。`,

      'evidence-analysis': shouldGenerateContent
        ? `✅ **已为您生成证据分析报告**\n\n我已经在画布上创建了一个新的报告节点，包含：\n• 📊 证据效力分析\n• 🔍 证据链条梳理\n• ⚖️ 证据采信预测\n• 📝 补强建议方案\n\n您可以点击新生成的节点查看详细分析结果。`
        : `证据分析建议：\n\n🔍 **分析维度**：\n• 证据的真实性、合法性、关联性\n• 证据的证明力和证明效果\n• 证据链条的完整性和逻辑性\n• 对方可能的质证和反驳\n\n📊 **分析方法**：\n• 分类整理各类证据\n• 评估证据证明力\n• 识别证据薄弱环节\n• 制定补强措施\n\n💡 **提示**：说"生成分析报告"我可以为您创建详细的证据分析。`,

      'decision-draft': shouldGenerateContent
        ? `✅ **已为您生成裁决执行方案**\n\n我已经在画布上创建了一个新的执行节点，包含：\n• 📋 执行程序指导\n• 💰 财产保全建议\n• ⚖️ 执行异议应对\n• 📝 执行和解方案\n\n您可以点击新生成的节点查看详细执行指导。`
        : `裁决起草指导：\n\n📝 **裁决结构**：\n• 案件基本情况\n• 当事人争议焦点\n• 事实认定和证据分析\n• 法律适用和裁决理由\n• 裁决主文和执行\n\n⚖️ **起草要点**：\n• 事实认定准确\n• 法律适用正确\n• 逻辑推理严密\n• 文字表述规范\n\n💡 **提示**：说"生成执行方案"我可以为您创建裁决执行指导。`
    }

    return {
      response: (responses as any)[node.type] || '我正在学习如何更好地为您服务，请告诉我您的具体需求。',
      generatedContent
    }


  }

  if (!isOpen || !node) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* 对话框头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getNodeIcon()}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{node.title}</h2>
              <p className="text-sm text-gray-600">{getNodeTypeName()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Save size={16} />
              保存
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('content')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-medium transition-colors",
              activeTab === 'content'
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <FileText size={16} />
            内容编辑
          </button>
          <button
            onClick={() => setActiveTab('ai-chat')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-medium transition-colors",
              activeTab === 'ai-chat'
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Bot size={16} />
            AI助手
            <Sparkles size={14} className="text-yellow-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'content' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="space-y-6">
                {/* 基本信息编辑 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    节点标题
                  </label>
                  <input
                    type="text"
                    value={editedNode.title || ''}
                    onChange={(e) => setEditedNode(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="输入节点标题..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    节点描述
                  </label>
                  <textarea
                    value={editedNode.description || ''}
                    onChange={(e) => setEditedNode(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="输入节点描述..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    状态
                  </label>
                  <select
                    value={editedNode.status || 'pending'}
                    onChange={(e) => setEditedNode(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="pending">待处理</option>
                    <option value="in-progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>

                {/* 节点特定内容编辑区域 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">专业内容编辑</h3>
                  <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                    <p className="text-gray-600 text-center">
                      🚧 专业编辑器开发中...
                      <br />
                      将支持富文本编辑、模板生成、AI辅助等功能
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="h-full flex flex-col">
              {/* AI对话区域 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-white" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-3 whitespace-pre-wrap",
                        message.role === 'user'
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-900"
                      )}
                    >
                      {message.content}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700">您</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* AI输入区域 */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAiSend()}
                    placeholder="向AI助手提问或寻求帮助..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NodeEditDialog
