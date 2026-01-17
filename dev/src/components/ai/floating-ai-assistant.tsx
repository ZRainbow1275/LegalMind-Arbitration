// src/components/ai/floating-ai-assistant.tsx
'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Bot,
  Send,
  Minimize2,
  Maximize2,
  Minimize,
  X,
  MessageSquare,
  Lightbulb,
  FileText,
  Calendar,
  Scale,
  Users,
  Settings,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Move
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useRole } from '@/components/layout/role-switcher';
import { useAIAssistantStore } from '@/store/ai-assistant';
import { useAIMessagesStore, generateAIResponse } from '@/store/ai-messages';
import { formatDateTime } from '@/lib/utils';

// 建议按钮组件 - 避免在map中创建新的onClick函数
const SuggestionButton = React.memo(({ suggestion, onSelect }: {
  suggestion: string;
  onSelect: (suggestion: string) => void;
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onSelect(suggestion)}
    className="text-xs h-6 px-2 bg-white/10 hover:bg-white/20 text-gray-700 border border-gray-300"
  >
    {suggestion}
  </Button>
));

SuggestionButton.displayName = 'SuggestionButton';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'case' | 'schedule' | 'document' | 'help';
}

export function FloatingAIAssistant() {
  const {
    isVisible,
    isOpen,
    isMinimized,
    position,
    setVisible,
    setOpen,
    setMinimized,
    setPosition,
    reset
  } = useAIAssistantStore();

  // 使用共享的消息store
  const {
    currentConversation,
    isTyping,
    inputValue,
    selectedFeature,
    setCurrentConversation,
    createNewConversation,
    addMessage,
    setIsTyping,
    setInputValue,
    setSelectedFeature,
    syncWithMainPage
  } = useAIMessagesStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { currentRole } = useRole();

  // 发送消息 - 使用useCallback避免重新创建（必须在handleQuickMessage之前定义）
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    // 添加用户消息
    addMessage({
      type: 'user',
      content: inputValue,
      context: {
        page: pathname,
        role: currentRole
      }
    });

    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // 模拟AI回复
    setTimeout(() => {
      const aiResponse = generateAIResponse(currentInput, selectedFeature, {
        page: pathname,
        role: currentRole
      });
      addMessage(aiResponse);
      setIsTyping(false);

      // 同步到主页面
      syncWithMainPage();
    }, 2000); // 固定延迟，避免hydration mismatch
  }, [inputValue, selectedFeature, addMessage, setInputValue, setIsTyping, pathname, currentRole, syncWithMainPage]);

  // 快捷消息 - 使用useCallback避免重新创建
  const handleQuickMessage = useCallback((message: string) => {
    setInputValue(message);
    setTimeout(() => handleSendMessage(), 100);
  }, [setInputValue, handleSendMessage]); // 依赖稳定的handleSendMessage

  // 根据当前页面和角色生成快捷操作 - 使用useMemo避免重新创建
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'create-case',
      title: '创建新案件',
      description: '快速创建新的仲裁案件',
      icon: <Scale className="w-4 h-4" />,
      action: () => {
        handleQuickMessage('帮我创建一个新的仲裁案件');
      },
      category: 'case'
    },
    {
      id: 'schedule-hearing',
      title: '安排庭审',
      description: '安排庭审时间和地点',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        handleQuickMessage('帮我安排一个庭审时间');
      },
      category: 'schedule'
    },
    {
      id: 'find-documents',
      title: '查找文档',
      description: '搜索相关案件文档',
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        handleQuickMessage('帮我查找相关的案件文档');
      },
      category: 'document'
    },
    {
      id: 'case-status',
      title: '案件状态查询',
      description: '查询案件当前进展',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => {
        handleQuickMessage('查询我的案件当前状态');
      },
      category: 'case'
    }
  ], [handleQuickMessage]); // 依赖handleQuickMessage

  // 改进的拖动功能
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只有在拖动手柄或悬浮按钮上才能拖动
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('.drag-handle') || target.closest('.floating-button');

    if (isDragHandle) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });

      // 添加拖动样式
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && typeof window !== 'undefined') {
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 动态计算组件尺寸限制
      const componentWidth = isOpen ? (isMinimized ? 320 : 384) : 56; // 悬浮按钮56px，展开384px，最小化320px
      const componentHeight = isOpen ? (isMinimized ? 64 : 600) : 56;
      const maxX = window.innerWidth - componentWidth - 20; // 添加边距
      const maxY = window.innerHeight - componentHeight - 20; // 添加边距

      setPosition({
        x: Math.max(20, Math.min(newX, maxX)), // 最小边距20px
        y: Math.max(20, Math.min(newY, maxY))  // 最小边距20px
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // 恢复默认样式
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // 根据路径自动隐藏（但不自动显示）
  useEffect(() => {
    // 在某些页面自动隐藏助手
    const hiddenPaths = ['/login', '/register', '/404', '/role-selection'];
    const shouldHide = hiddenPaths.some(path => pathname.includes(path));

    if (shouldHide && isVisible) {
      console.log('在受限页面，自动隐藏AI助手:', pathname);
      setVisible(false);
    }
    // 移除自动显示逻辑，让用户完全控制显示状态
  }, [pathname, setVisible, isVisible]);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  // 确保有当前对话
  useEffect(() => {
    if (!currentConversation && isOpen) {
      createNewConversation();
    }
  }, [currentConversation, isOpen, createNewConversation]);

  // 跳转到AI助手页面
  const handleGoToAIPage = () => {
    // 同步当前对话到主页面
    syncWithMainPage();
    router.push('/ai-assistant');
  };

  // 重置助手状态
  const handleResetAssistant = () => {
    reset();
  };



  // 如果不可见，不渲染组件
  if (!isVisible) {
    return null;
  }

  // 悬浮按钮 - 球状态
  if (!isOpen) {
    return (
      <div
        className={`fixed z-50 group transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div
          className="floating-button relative"
          onMouseDown={handleMouseDown}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) {
                setOpen(true);
              }
            }}
            className={`w-14 h-14 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden ${
              isDragging ? 'scale-110' : 'hover:scale-105'
            }`}
          >
            {/* 背景动画 */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <Bot className={`w-6 h-6 text-white transition-all duration-300 ${
              isDragging ? 'scale-90' : 'group-hover:scale-110'
            }`} />

            {/* 拖动指示器 */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200 ${
              isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <Move className="w-2 h-2 text-gray-400 absolute top-0.5 left-0.5" />
            </div>

            {/* 脉冲效果 */}
            <div className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20" />
          </Button>
        </div>

        {/* 提示气泡 - 只在非拖动状态显示 */}
        {!isDragging && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg p-3 border max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10 transform translate-y-2 group-hover:translate-y-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium">AI智能助手</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              点击展开对话 · 拖动移动位置
            </p>
            {/* 箭头指示器 */}
            <div className="absolute bottom-0 right-4 transform translate-y-full">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>
          </div>
        )}

        {/* 控制按钮组 - 只在非拖动状态显示 */}
        {!isDragging && (
          <div className="absolute -top-12 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform -translate-y-2 group-hover:translate-y-0">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 bg-white/95 hover:bg-white shadow-sm border backdrop-blur-sm transition-all duration-200 hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                handleGoToAIPage();
              }}
              title="打开AI助手页面"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 bg-white/95 hover:bg-white shadow-sm border backdrop-blur-sm transition-all duration-200 hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
              title="隐藏助手"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 助手界面 - 窗口状态
  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      } ${isDragging ? 'scale-105 shadow-2xl' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <Card className={`w-full h-full shadow-2xl border-primary-200 overflow-hidden transition-all duration-300 ${
        isDragging ? 'shadow-3xl border-primary-300' : ''
      }`}>
        <CardHeader
          className={`flex flex-row items-center justify-between p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white cursor-move drag-handle transition-all duration-200 ${
            isDragging ? 'from-primary-700 to-primary-800' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className={`w-5 h-5 transition-transform duration-200 ${
              isDragging ? 'scale-110' : ''
            }`} />
            <span className="transition-all duration-200">
              {isMinimized ? 'AI助手' : 'AI智能助手'}
            </span>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 transition-all duration-200">
              在线
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleGoToAIPage();
              }}
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              title="打开AI助手页面"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setMinimized(!isMinimized);
              }}
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              title={isMinimized ? '展开窗口' : '最小化窗口'}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4 transition-transform duration-200" />
              ) : (
                <Minimize2 className="w-4 h-4 transition-transform duration-200" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              title="收起为悬浮球"
            >
              <Minimize className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
              className="text-white hover:bg-red-500/20 transition-all duration-200 hover:scale-105"
              title="隐藏助手"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="flex flex-col h-full p-0">
            {/* 快捷操作 */}
            <div className="p-4 border-b bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">快捷操作</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 4).map(action => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={action.action}
                    className="justify-start text-xs h-8"
                  >
                    {action.icon}
                    <span className="ml-1 truncate">{action.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 消息区域 */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {(currentConversation?.messages || []).map(message => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp instanceof Date
                          ? message.timestamp.toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : formatDateTime(message.timestamp).split(' ')[1]
                        }
                      </p>
                      
                      {/* 建议回复 */}
                      {message.type === 'assistant' && message.suggestions && (
                        <div className="mt-2 space-y-1">
                          {message.suggestions.map((suggestion, index) => (
                            <SuggestionButton
                              key={`${message.id}-suggestion-${index}`}
                              suggestion={suggestion}
                              onSelect={handleQuickMessage}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 正在输入指示器 */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 输入区域 */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="输入您的问题..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
