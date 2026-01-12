import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  Loader2
} from 'lucide-react'
import { cn } from '../lib/utils'
import { LegalNodeData } from '../types/legal-nodes'
import { DraggablePanel } from './common/DraggablePanel'

interface AIDialogProps {
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
  type?: 'text' | 'code' | 'document'
}

const AIDialog: React.FC<AIDialogProps> = ({
  node,
  isOpen,
  onClose,
  onNodeUpdate
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 初始化对话
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage(node.type)
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        type: 'text'
      }])
    }
  }, [isOpen, node.type, messages.length])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 获取欢迎消息
  const getWelcomeMessage = (nodeType: string): string => {
    const welcomeMessages = {
      'document': `您好！我是您的AI法律文书助手。我可以帮助您：
• 起草各类法律文书
• 审查文书内容
• 提供格式建议
• 法条引用检查

请告诉我您需要什么帮助？`,
      'ai-chat': `您好！我是您的AI法律顾问。我可以为您提供：
• 法律问题咨询
• 案例分析
• 法条解释
• 策略建议

有什么法律问题需要咨询吗？`,
      'hearing': `您好！我是您的AI庭审助手。我可以协助您：
• 庭审准备工作
• 争议焦点梳理
• 证据材料整理
• 庭审策略制定

需要我帮您准备什么？`,
      'timeline': `您好！我是您的AI时间管理助手。我可以帮助您：
• 制定案件时间表
• 提醒重要节点
• 优化工作流程
• 风险预警

需要制定什么时间计划？`,
      'collaboration': `您好！我是您的AI协作助手。我可以协助：
• 多方沟通协调
• 会议纪要整理
• 任务分配建议
• 进度跟踪

需要协调什么工作？`
    }
    return welcomeMessages[nodeType as keyof typeof welcomeMessages] || '您好！我是您的AI助手，有什么可以帮助您的吗？'
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse: ChatMessage = generateIntelligentResponse(userMessage.content, node.type)
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
    }, 1000 + Math.random() * 2000)
  }

  // 生成AI响应（模拟）
  const generateIntelligentResponse = (userInput: string, nodeType: string): ChatMessage => {
    // Use userInput to generate response (simulated)
    console.log('Analyzing user input:', userInput);
    const responses = {
      'document': [
        '我已经为您准备了文书模板，请查看是否符合您的需求...',
        '根据您的描述，建议采用以下文书结构...',
        '我注意到您的文书中可能需要补充以下法条依据...'
      ],
      'ai-chat': [
        '根据相关法律规定，您的情况可能涉及以下几个方面...',
        '建议您收集以下证据材料来支持您的主张...',
        '从法律角度分析，您的案件有以下几个关键点...'
      ],
      'hearing': [
        '庭审准备建议：请重点关注以下争议焦点...',
        '根据对方可能的抗辩，建议您准备以下应对策略...',
        '证据展示顺序建议：先出示核心证据...'
      ],
      'timeline': [
        '根据案件类型，建议制定以下时间节点...',
        '重要提醒：距离关键期限还有X天，请及时准备...',
        '工作流程优化建议：可以并行处理以下任务...'
      ],
      'collaboration': [
        '建议召开协调会议，议题包括...',
        '任务分工建议：根据各方专长进行分配...',
        '沟通要点整理：需要重点讨论的问题有...'
      ]
    }

    const nodeResponses = responses[nodeType as keyof typeof responses] || responses['ai-chat']
    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: nodeResponses[Math.floor(Math.random() * nodeResponses.length)],
      timestamp: new Date(),
      type: 'text'
    }
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <DraggablePanel
      title={`AI助手 - ${node.title || '未命名节点'}`}
      initialPosition={{ x: window.innerWidth - 450, y: window.innerHeight - 650 }}
      onClose={onClose}
      width={400}
      height={600}
    >
      <div className="flex flex-col h-full bg-background">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg p-3 text-sm",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === 'assistant' ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
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
              placeholder="输入您的问题或需求..."
              className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
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
            <span>{messages.length} 条对话</span>
          </div>
        </div>
      </div>
    </DraggablePanel>
  )
}

export default AIDialog
