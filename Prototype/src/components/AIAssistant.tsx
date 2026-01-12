import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  FileText,
  MessageSquare,
  Video,
  Clock,
  Users,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
  Scale,
  Gavel,
  FileCheck,
  Lightbulb,
  Target,
  AlertCircle
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LegalNodeData } from '../types/legal-nodes'

interface AIAssistantProps {
  node: LegalNodeData
  isOpen: boolean
  onClose: () => void
  onNodeUpdate?: (node: LegalNodeData) => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'suggestion' | 'document' | 'analysis'
  metadata?: {
    confidence?: number
    sources?: string[]
    actions?: Array<{
      label: string
      action: string
      icon?: React.ReactNode
    }>
  }
}

interface AICapability {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  prompt: string
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  node,
  isOpen,
  onClose,
  onNodeUpdate
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 获取节点特定的AI能力
  const getAICapabilities = (nodeType: string): AICapability[] => {
    const capabilities = {
      'document': [
        {
          id: 'draft',
          name: '文书起草',
          description: '智能起草各类法律文书',
          icon: <FileText size={16} />,
          prompt: '请帮我起草一份法律文书，类型是：'
        },
        {
          id: 'review',
          name: '文书审查',
          description: '审查文书内容和格式',
          icon: <FileCheck size={16} />,
          prompt: '请帮我审查这份文书的内容和格式：'
        },
        {
          id: 'legal-check',
          name: '法条检查',
          description: '检查法条引用的准确性',
          icon: <Scale size={16} />,
          prompt: '请检查以下内容的法条引用是否准确：'
        }
      ],
      'ai-chat': [
        {
          id: 'legal-advice',
          name: '法律咨询',
          description: '提供专业法律建议',
          icon: <Gavel size={16} />,
          prompt: '我有一个法律问题需要咨询：'
        },
        {
          id: 'case-analysis',
          name: '案例分析',
          description: '分析相似案例和判决',
          icon: <BookOpen size={16} />,
          prompt: '请帮我分析相关案例：'
        },
        {
          id: 'strategy',
          name: '策略建议',
          description: '制定诉讼或仲裁策略',
          icon: <Target size={16} />,
          prompt: '请为我的案件制定策略建议：'
        }
      ],
      'hearing': [
        {
          id: 'prep',
          name: '庭审准备',
          description: '准备庭审材料和流程',
          icon: <Video size={16} />,
          prompt: '请帮我准备庭审，需要关注：'
        },
        {
          id: 'focus',
          name: '争议焦点',
          description: '梳理案件争议焦点',
          icon: <Target size={16} />,
          prompt: '请帮我梳理案件的争议焦点：'
        },
        {
          id: 'evidence',
          name: '证据整理',
          description: '整理和分析证据材料',
          icon: <FileCheck size={16} />,
          prompt: '请帮我整理证据材料：'
        }
      ],
      'timeline': [
        {
          id: 'schedule',
          name: '时间规划',
          description: '制定案件时间表',
          icon: <Clock size={16} />,
          prompt: '请帮我制定案件时间规划：'
        },
        {
          id: 'deadline',
          name: '期限提醒',
          description: '重要期限和风险提醒',
          icon: <AlertCircle size={16} />,
          prompt: '请提醒我重要的时间节点：'
        }
      ],
      'collaboration': [
        {
          id: 'coordination',
          name: '协调沟通',
          description: '协调多方沟通事宜',
          icon: <Users size={16} />,
          prompt: '需要协调以下事宜：'
        },
        {
          id: 'meeting',
          name: '会议纪要',
          description: '整理会议要点',
          icon: <FileText size={16} />,
          prompt: '请帮我整理会议纪要：'
        }
      ]
    }
    return capabilities[nodeType as keyof typeof capabilities] || capabilities['ai-chat']
  }

  // 初始化对话
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const capabilities = getAICapabilities(node.type)
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `您好！我是您的AI法律助手。我可以为您提供以下专业服务：

${capabilities.map(cap => `• **${cap.name}**: ${cap.description}`).join('\n')}

请选择您需要的服务，或直接告诉我您的需求。`,
        timestamp: new Date(),
        type: 'text',
        metadata: {
          confidence: 100,
          actions: capabilities.map(cap => ({
            label: cap.name,
            action: cap.id,
            icon: cap.icon
          }))
        }
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, node.type, messages.length])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSendMessage = async (customMessage?: string) => {
    const messageContent = customMessage || inputValue.trim()
    if (!messageContent || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse = generateIntelligentResponse(messageContent, node.type)
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)

      // 更新节点状态
      if (onNodeUpdate) {
        onNodeUpdate({
          ...node,
          status: 'in-progress',
          updatedAt: new Date()
        })
      }
    }, 1500 + Math.random() * 2000)
  }

  // 生成智能响应
  const generateIntelligentResponse = (userInput: string, nodeType: string): ChatMessage => {
    // Use userInput to generate response (simulated)
    console.log('Analyzing user input:', userInput);
    const responses = {
      'document': {
        content: `基于您的需求，我为您准备了以下建议：

**文书结构建议：**
1. 标题和当事人信息
2. 事实陈述部分
3. 法律依据和理由
4. 请求事项

**关键法条参考：**
• 《仲裁法》第21条 - 仲裁申请的基本要求
• 《民事诉讼法》相关条款

**注意事项：**
- 确保事实陈述清晰准确
- 法条引用要准确完整
- 证据材料要充分支撑`,
        type: 'analysis' as const,
        confidence: 92
      },
      'ai-chat': {
        content: `根据您的描述，我分析如下：

**法律分析：**
您的情况涉及合同纠纷，主要争议点在于合同履行问题。

**建议策略：**
1. 收集完整的合同履行证据
2. 分析对方违约的具体情形
3. 计算损失金额和违约责任

**相关案例：**
类似案件中，法院通常会重点审查合同条款的明确性和履行情况。

**下一步行动：**
建议先整理证据材料，然后考虑调解或仲裁程序。`,
        type: 'analysis' as const,
        confidence: 88
      },
      'hearing': {
        content: `庭审准备方案：

**争议焦点梳理：**
1. 合同效力问题
2. 履行义务认定
3. 违约责任承担

**证据展示策略：**
• 核心证据：合同原件、履行凭证
• 辅助证据：通信记录、第三方证明
• 专家意见：必要时申请专业鉴定

**庭审发言要点：**
- 开庭陈述要简洁有力
- 举证环节要条理清晰
- 质证时要抓住关键问题

**风险预警：**
注意对方可能提出的抗辩理由，提前准备应对策略。`,
        type: 'analysis' as const,
        confidence: 95
      }
    }

    const response = responses[nodeType as keyof typeof responses] || responses['ai-chat']

    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      type: response.type,
      metadata: {
        confidence: response.confidence,
        sources: ['《仲裁法》', '《合同法》', '相关判例'],
        actions: [
          {
            label: '生成文书模板',
            action: 'generate-template',
            icon: <FileText size={14} />
          },
          {
            label: '查看相关案例',
            action: 'view-cases',
            icon: <BookOpen size={14} />
          },
          {
            label: '制定详细策略',
            action: 'detailed-strategy',
            icon: <Target size={14} />
          }
        ]
      }
    }
  }

  // 处理快捷操作
  const handleQuickAction = (capability: AICapability) => {
    setSelectedCapability(capability.id)
    handleSendMessage(capability.prompt)
  }

  // 处理消息操作
  const handleMessageAction = (action: string) => {
    console.log('执行操作:', action)
    // 这里可以实现具体的操作逻辑
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 获取节点图标
  const getNodeIcon = () => {
    const iconProps = { size: 20, className: 'text-primary' }

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
      default:
        return <MessageSquare {...iconProps} />
    }
  }

  if (!isOpen) return null

  const capabilities = getAICapabilities(node.type)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={cn(
          "bg-card border border-border rounded-lg shadow-2xl flex flex-col transition-all duration-300",
          isMaximized
            ? "w-full h-full max-w-none max-h-none"
            : "w-full max-w-5xl h-[85vh] max-h-[900px]"
        )}
      >
        {/* 对话框头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getNodeIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                AI法律助手 - {node.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {getNodeTypeText(node.type)} • 智能分析 • 专业建议
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title={isMaximized ? "还原窗口" : "最大化窗口"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="关闭对话"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧能力面板 */}
          <div className="w-64 border-r border-border bg-muted/30 p-4">
            <h4 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
              <Lightbulb size={16} className="text-primary" />
              AI能力
            </h4>
            <div className="space-y-2">
              {capabilities.map(capability => (
                <button
                  key={capability.id}
                  onClick={() => handleQuickAction(capability)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all duration-200 hover:bg-background hover:shadow-sm",
                    selectedCapability === capability.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-background border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {capability.icon}
                    <span className="font-medium text-sm">{capability.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {capability.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 右侧对话区域 */}
          <div className="flex-1 flex flex-col">
            {/* 消息列表 */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-primary-foreground" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-3 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border shadow-sm"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* 消息元数据 */}
                    {message.metadata && message.role === 'assistant' && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        {message.metadata.confidence && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">置信度:</span>
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${message.metadata.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{message.metadata.confidence}%</span>
                          </div>
                        )}

                        {message.metadata.actions && (
                          <div className="flex flex-wrap gap-2">
                            {message.metadata.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleMessageAction(action.action)}
                                className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded text-xs transition-colors"
                              >
                                {action.icon}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={cn(
                      "text-xs mt-2 opacity-70",
                      message.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {message.timestamp.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-primary-foreground" />
                  </div>
                  <div className="bg-background border border-border rounded-lg px-4 py-3 flex items-center gap-2 shadow-sm">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">AI正在分析...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="描述您的法律需求或问题..."
                  className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[120px]"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                    inputValue.trim() && !isLoading
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  发送
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>按 Enter 发送，Shift + Enter 换行</span>
                <span>{messages.length} 条对话 • AI已就绪</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 辅助函数
function getNodeTypeText(nodeType: string): string {
  const typeTexts = {
    'document': '法律文书助手',
    'ai-chat': '法律咨询助手',
    'hearing': '庭审准备助手',
    'timeline': '时间管理助手',
    'collaboration': '协作沟通助手'
  }
  return typeTexts[nodeType as keyof typeof typeTexts] || 'AI助手'
}

export default AIAssistant
