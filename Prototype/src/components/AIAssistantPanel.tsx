/**
 * LegalMind 法律工作台 - AI助手面板
 *
 * 提供实时AI对话、智能建议和内容生成功能
 * 支持Flowith式的AI驱动节点创建
 *
 * 【AI服务集成】
 * - 使用AIService接口，支持多种AI提供商
 * - 当前使用MockAIService模拟实现
 * - 未来可切换到真实AI服务（OpenAI、Claude等）
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  Bot,
  Send,
  FileText,
  Users,
  Clock,
  Settings,
  MessageSquare,
  Lightbulb,
  Plus,
  ChevronDown
} from 'lucide-react'

import { AIServiceFactory, AIService } from '../services/AIService'

// ==================== 类型定义 ====================

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'suggestion' | 'node-creation'
  metadata?: any
}

interface AIAssistantPanelProps {
  isVisible: boolean
  onToggle: () => void
  onCreateNode?: (nodeData: any) => void
  currentContext?: {
    selectedNodes: string[]
    selectedConnections: string[]
    canvasState: any
  }
}

// ==================== 主组件 ====================

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  onToggle,
  onCreateNode,
  currentContext
}) => {
  // ==================== AI服务初始化 ====================
  const aiService = useRef<AIService>(AIServiceFactory.getDefault())

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 您好！我是您的AI法律助手。我可以帮助您：\n\n🎯 **智能节点创建** - 描述您的需求，我会自动创建相应的节点\n📝 **文书生成** - 生成各类法律文书和模板\n⚖️ **案例分析** - 提供法律条文和案例建议\n🔗 **关系梳理** - 帮助理清人物和事件关系\n\n请告诉我您需要什么帮助？',
      timestamp: new Date(),
      type: 'text'
    }
  ])

  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeMode, setActiveMode] = useState<'chat' | 'suggestions' | 'templates'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ==================== 自动滚动到底部 ====================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ==================== AI对话处理 ====================

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = inputValue
    setInputValue('')
    setIsLoading(true)

    try {
      // 使用AIService分析用户意图
      const aiResponse = await aiService.current.analyzeUserIntent(userInput, currentContext)

      // 转换AIResponse为AIMessage
      const aiMessage: AIMessage = {
        id: aiResponse.id,
        role: 'assistant',
        content: aiResponse.content,
        timestamp: aiResponse.timestamp,
        type: aiResponse.type === 'node-suggestion' ? 'node-creation' :
          aiResponse.type === 'analysis' ? 'suggestion' : 'text',
        metadata: aiResponse.metadata
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI响应错误:', error)

      // 错误处理：显示友好的错误消息
      const errorMessage: AIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。请稍后再试。',
        timestamp: new Date(),
        type: 'text'
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== 节点创建建议 ====================
  // 注意：此函数已被AIService替代，保留用于兼容性



  // ==================== 快捷建议 ====================

  const quickSuggestions = [
    { icon: <FileText className="w-4 h-4" />, text: '创建案件信息节点', action: () => setInputValue('创建一个新的案件信息节点') },
    { icon: <Users className="w-4 h-4" />, text: '添加人物关系', action: () => setInputValue('添加人物关系节点') },
    { icon: <Clock className="w-4 h-4" />, text: '制作时间轴', action: () => setInputValue('创建案件时间轴') },
    { icon: <Settings className="w-4 h-4" />, text: '设计流程模板', action: () => setInputValue('设计庭审流程模板') }
  ]

  // ==================== 渲染消息 ====================

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user'

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          {!isUser && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs text-gray-500">AI助手</span>
            </div>
          )}

          <div className={`rounded-lg px-4 py-3 ${isUser
            ? 'bg-orange-500 text-white'
            : message.type === 'suggestion'
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-gray-100 text-gray-800'
            }`}>
            <div className="whitespace-pre-wrap text-sm">{message.content}</div>

            {/* 节点创建按钮 */}
            {message.type === 'node-creation' && message.metadata && (
              <button
                onClick={() => onCreateNode?.(message.metadata.nodeData)}
                className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                创建 {message.metadata.nodeTitle}
              </button>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    )
  }

  // ==================== 渲染 ====================

  return (
    <div className="h-full bg-white flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI法律助手</h3>
            <p className="text-xs text-gray-500">智能工作流助手</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-orange-600 transition-colors p-1 rounded-md hover:bg-orange-100"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* 模式切换 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'chat', label: '对话', icon: <MessageSquare className="w-4 h-4" /> },
          { key: 'suggestions', label: '建议', icon: <Lightbulb className="w-4 h-4" /> },
          { key: 'templates', label: '模板', icon: <FileText className="w-4 h-4" /> }
        ].map(mode => (
          <button
            key={mode.key}
            onClick={() => setActiveMode(mode.key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-200 ${activeMode === mode.key
              ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50 shadow-sm'
              : 'text-gray-500 hover:text-orange-600 hover:bg-orange-50'
              }`}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
        {activeMode === 'chat' && (
          <>
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="描述您的需求，我会为您创建相应的节点..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {activeMode === 'suggestions' && (
          <div className="p-4 space-y-3">
            <h4 className="font-medium text-gray-900 mb-3">快捷操作</h4>
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={suggestion.action}
                className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-orange-500">{suggestion.icon}</div>
                <span className="text-sm text-gray-700">{suggestion.text}</span>
              </button>
            ))}
          </div>
        )}

        {activeMode === 'templates' && (
          <div className="p-4 space-y-3">
            <h4 className="font-medium text-gray-900 mb-3">文书模板</h4>
            <div className="text-sm text-gray-500">
              文书模板功能正在开发中...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIAssistantPanel
