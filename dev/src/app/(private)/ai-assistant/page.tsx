// dev/src/app/(private)/ai-assistant/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIMessagesStore, generateAIResponse } from '@/store/ai-messages';
import { useModuleSync, dataSyncManager } from '@/lib/data-sync';
import { formatDateTime } from '@/lib/utils';
import { z } from 'zod';

// 用于生成唯一ID的计数器，避免hydration mismatch
let aiTaskIdCounter = 0;
const generateAITaskId = () => `ai-task-${++aiTaskIdCounter}`;

const caseChangedEventDataSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    caseNumber: z.string().optional(),
  })
  .passthrough();

const mediationCompletedEventDataSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
  })
  .passthrough();
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  Scale,
  Brain,
  MessageSquare,
  Upload,
  Download,
  Copy,
  RefreshCw,
  Lightbulb,
  Search,
  BookOpen,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';

// 模拟AI助手功能
const aiFeatures = [
  {
    id: 'case-analysis',
    title: '案件分析',
    description: '智能分析案件事实，识别争议焦点和法律问题',
    icon: Scale,
    color: 'bg-blue-100 text-blue-600',
    examples: ['分析合同纠纷的关键争议点', '识别证据链的完整性', '评估案件胜诉概率']
  },
  {
    id: 'document-summary',
    title: '文档总结',
    description: '自动总结长篇文档，提取关键信息和要点',
    icon: FileText,
    color: 'bg-green-100 text-green-600',
    examples: ['总结合同条款要点', '提取证据材料关键信息', '生成庭审记录摘要']
  },
  {
    id: 'legal-advice',
    title: '法律建议',
    description: '基于法律知识库提供专业的法律意见和建议',
    icon: Brain,
    color: 'bg-purple-100 text-purple-600',
    examples: ['合同条款合规性分析', '仲裁程序指导', '证据收集建议']
  },
  {
    id: 'draft-generation',
    title: '文书起草',
    description: '智能生成各类法律文书和仲裁文件',
    icon: Sparkles,
    color: 'bg-orange-100 text-orange-600',
    examples: ['起草仲裁申请书', '生成答辩书模板', '制作庭审大纲']
  }
];

// 模拟对话历史
const mockConversations = [
  {
    id: 'conv-1',
    title: '合同纠纷案件分析',
    lastMessage: '根据您提供的合同条款，我发现了3个主要争议点...',
    timestamp: '2024-02-15 14:30',
    type: 'case-analysis'
  },
  {
    id: 'conv-2',
    title: '证据材料总结',
    lastMessage: '已完成对20份证据材料的总结，关键证据包括...',
    timestamp: '2024-02-14 16:45',
    type: 'document-summary'
  },
  {
    id: 'conv-3',
    title: '仲裁程序咨询',
    lastMessage: '关于仲裁员回避的程序，您需要注意以下几点...',
    timestamp: '2024-02-13 10:20',
    type: 'legal-advice'
  }
];

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const moduleSync = useModuleSync('ai-assistant-module');

  // 使用共享的消息store
  const {
    currentConversation,
    conversations,
    isTyping,
    inputValue,
    selectedFeature,
    setCurrentConversation,
    createNewConversation,
    addMessage,
    setIsTyping,
    setInputValue,
    setSelectedFeature,
    clearCurrentConversation,
    syncWithFloatingAssistant
  } = useAIMessagesStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  // 确保有当前对话 - 只在组件挂载时检查一次
  useEffect(() => {
    if (!currentConversation) {
      createNewConversation(selectedFeature);
    }
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 数据同步初始化
  useEffect(() => {
    // 注册模块
    moduleSync.register();

    // 订阅数据同步事件
    const unsubscribe = moduleSync.subscribeToEvents((event) => {
      console.log('AI Assistant module received sync event:', event);

      switch (event.type) {
        case 'case_created':
        case 'case_updated':
          // 当案件创建或更新时，可以生成AI任务
          {
            const parsed = caseChangedEventDataSchema.safeParse(event.data);
            if (!parsed.success) break;
            const data = parsed.data;
            dataSyncManager.publishAITaskEvent('created', {
              id: generateAITaskId(),
              type: 'case_analysis',
              caseId: data.id,
              title: `分析案件：${data.title || data.caseNumber || data.id}`,
              priority: 'medium',
              status: 'pending'
            }, 'ai-assistant-module');
          }
          break;

        case 'mediation_completed':
          // 调解完成时，生成总结任务
          {
            const parsed = mediationCompletedEventDataSchema.safeParse(event.data);
            if (!parsed.success) break;
            const data = parsed.data;
            dataSyncManager.publishAITaskEvent('created', {
              id: generateAITaskId(),
              type: 'mediation_summary',
              mediationId: data.id,
              title: `调解总结：${data.title || data.id}`,
              priority: 'high',
              status: 'pending'
            }, 'ai-assistant-module');
          }
          break;
      }
    });

    return () => {
      unsubscribe();
      moduleSync.unregister();
    };
  }, []); // 移除moduleSync依赖，避免无限循环

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() && !uploadedFile) return;

    const messageContent = inputValue || `上传了文件: ${uploadedFile?.name}`;

    // 添加用户消息
    addMessage({
      type: 'user',
      content: messageContent,
      feature: selectedFeature,
      context: {
        page: '/ai-assistant'
      }
    });

    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse = generateAIResponseForFile(currentInput, selectedFeature, uploadedFile);
      addMessage(aiResponse);
      setIsTyping(false);
      setUploadedFile(null);

      // 同步到悬浮助手
      syncWithFloatingAssistant();
    }, 2000);
  }, [inputValue, uploadedFile, selectedFeature, addMessage, setInputValue, setIsTyping, setUploadedFile, syncWithFloatingAssistant]);

  // 处理文件上传的AI响应
  const generateAIResponseForFile = (message: string, feature: string, file?: File | null) => {
    if (file) {
      return {
        type: 'assistant' as const,
        content: `我已经收到您上传的文件"${file.name}"。正在分析文档内容...\n\n基于初步分析，这份文档包含以下关键信息：\n• 文档类型：${file.type.includes('pdf') ? 'PDF文档' : '其他格式'}\n• 文件大小：${(file.size / 1024).toFixed(1)} KB\n• 建议处理方式：进行详细的内容分析和关键信息提取\n\n请告诉我您希望我重点关注文档的哪些方面？`,
        feature,
        context: { page: '/ai-assistant' },
        suggestions: ['分析文档内容', '提取关键信息', '生成摘要报告']
      };
    }

    // 使用共享的generateAIResponse函数
    return generateAIResponse(message, feature, { page: '/ai-assistant' });
  };

  const handleFeatureSelect = (featureId: string) => {
    // 避免重复选择同一功能
    if (selectedFeature !== featureId) {
      setSelectedFeature(featureId);
      // 延迟创建新对话，避免同步状态更新导致的循环
      setTimeout(() => {
        createNewConversation(featureId);
      }, 0);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="h-8 w-8 text-orange-500" />
            AI智能助手
          </h1>
          <p className="text-gray-600 mt-1">
            专业的法律AI助手，为您提供智能化的案件分析和法律服务
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-green-100 text-green-800">
            <Zap className="h-3 w-3 mr-1" />
            在线服务
          </Badge>
          <Badge variant="outline">
            GPT-4 驱动
          </Badge>
        </div>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aiFeatures.map(feature => {
          const IconComponent = feature.icon;
          return (
            <Card 
              key={feature.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedFeature === feature.id ? 'ring-2 ring-orange-500' : ''
              }`}
              onClick={() => handleFeatureSelect(feature.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${feature.color}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium">{feature.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                <div className="text-xs text-gray-500">
                  点击开始使用
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 对话历史 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">对话历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockConversations.map(conv => (
                <div 
                  key={conv.id} 
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    // 加载历史对话 - 避免直接调用可能导致循环的状态更新
                    if (selectedFeature !== conv.type) {
                      setSelectedFeature(conv.type);
                      // 延迟创建新对话，避免同步状态更新导致的循环
                      setTimeout(() => {
                        createNewConversation(conv.type);
                      }, 0);
                    }
                  }}
                >
                  <h4 className="font-medium text-sm mb-1">{conv.title}</h4>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{conv.lastMessage}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{conv.timestamp}</span>
                    <Badge variant="outline" className="text-xs">
                      {aiFeatures.find(f => f.id === conv.type)?.title}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 聊天界面 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                智能对话
                {selectedFeature && (
                  <Badge className="ml-2">
                    {aiFeatures.find(f => f.id === selectedFeature)?.title}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => clearCurrentConversation()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  清空对话
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 消息列表 */}
            <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
              {!currentConversation || currentConversation.messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>选择一个功能开始对话，或直接输入您的问题</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentConversation.messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-white border shadow-sm'
                      }`}>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-orange-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp instanceof Date
                            ? message.timestamp.toLocaleTimeString('zh-CN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : typeof message.timestamp === 'string'
                              ? message.timestamp
                              : formatDateTime(message.timestamp)
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border shadow-sm p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                          <span className="text-gray-600">AI正在思考...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 文件上传区域 */}
            {uploadedFile && (
              <Alert className="mb-4">
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  已选择文件：{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => setUploadedFile(null)}
                  >
                    移除
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* 输入区域 */}
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  placeholder="输入您的问题或需求..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={3}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={(!inputValue.trim() && !uploadedFile) || isTyping}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
