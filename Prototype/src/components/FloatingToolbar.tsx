/**
 * 浮动工具栏组件 - 优化版
 * 使用分组折叠设计，减少视觉混乱
 * 常用功能直接显示，高级功能折叠到下拉菜单
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Network,
  Brain,
  Target,
  Lightbulb,
  Shield,
  Gavel,
  Users,
  Save,
  Download,
  BookOpen,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  Plus,
  Scale,
  FileText,
  Calendar,
  Pin,
  PinOff,
  GripVertical,
  ChevronUp,
  Activity, // {{ AURA: Add - 性能监控图标 }}
  Undo, // {{ AURA: Add - 撤销图标 }}
  Redo, // {{ AURA: Add - 重做图标 }}
  HelpCircle, // {{ AURA: Add - 帮助图标 }}
  Mic, // {{ AURA: Add - 麦克风图标 }}
} from 'lucide-react';
import { CollaborationControl, Participant } from './collaboration/CollaborationControl'; // {{ AURA: Add - 协作控制组件 }}

interface FloatingToolbarProps {
  // 视图控制
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitToScreen: () => void;

  // 功能操作
  onCreateNode: (type: string) => void;
  onSmartLayout: () => void;
  onArbitrationPanel: () => void;
  onAIAnalysis: () => void;
  onRelationDetection: () => void;
  onSmartRecommendation: () => void;
  onLegalArticleCitation: () => void;
  onPermissionManagement: () => void;
  onConnectionMode: () => void;
  onCollaboration: () => void;
  onSave: () => void;
  onExport: () => void;
  onPerformanceMonitor?: () => void; // {{ AURA: Add - 性能监控回调 }}
  onUndo?: () => void; // {{ AURA: Add - 撤销回调 }}
  onRedo?: () => void; // {{ AURA: Add - 重做回调 }}
  onRestartTutorial?: () => void; // {{ AURA: Add - 重新查看引导回调 }}

  // 状态
  isConnecting?: boolean;
  canUndo?: boolean; // {{ AURA: Add - 是否可以撤销 }}
  canRedo?: boolean; // {{ AURA: Add - 是否可以重做 }}

  // {{ AURA: Add - 响应式适配 }}
  defaultMode?: ToolbarMode; // 默认模式（用于响应式适配）

  // {{ AURA: Add - 协作相关Props }}
  participants?: Participant[];
  isCallActive?: boolean;
  onStartCall?: (selectedIds: string[], type: 'video' | 'audio') => void;
  onEndCall?: () => void;
  onJoinCall?: () => void;
  onCreateVoiceZone?: () => void; // {{ AURA: Add - 创建语音场回调 }}
  isCreatingVoiceZone?: boolean; // {{ AURA: Add - 是否正在创建语音场 }}
}

// 工具栏模式类型
type ToolbarMode = 'fixed' | 'floating';

// 工具栏状态接口
interface ToolbarState {
  mode: ToolbarMode;
  position: { x: number; y: number };
  collapsed: boolean;
}

// localStorage键名
const STORAGE_KEY = 'legalmind-toolbar-state';

// 默认状态
const getDefaultState = (defaultMode?: ToolbarMode): ToolbarState => ({
  mode: defaultMode || 'fixed',
  position: {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 300 : 0,
    y: 24
  },
  collapsed: false,
});

export const FloatingToolbar = React.memo<FloatingToolbarProps>(({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToScreen,
  onCreateNode,
  onSmartLayout,
  onArbitrationPanel,
  onAIAnalysis,
  onRelationDetection,
  onSmartRecommendation,
  onLegalArticleCitation,
  onPermissionManagement,
  onConnectionMode,

  onSave,
  onExport,
  onPerformanceMonitor, // {{ AURA: Add - 性能监控回调 }}
  onUndo, // {{ AURA: Add - 撤销回调 }}
  onRedo, // {{ AURA: Add - 重做回调 }}
  onRestartTutorial, // {{ AURA: Add - 重新查看引导回调 }}
  isConnecting = false,
  canUndo = false, // {{ AURA: Add - 是否可以撤销 }}
  canRedo = false, // {{ AURA: Add - 是否可以重做 }}
  defaultMode, // {{ AURA: Add - 默认模式（响应式适配） }}
  // {{ AURA: Add - 协作Props }}
  participants = [],
  isCallActive = false,
  onStartCall,
  onEndCall,
  onJoinCall,
  onCreateVoiceZone, // {{ AURA: Add - 创建语音场回调 }}
  isCreatingVoiceZone = false, // {{ AURA: Add - 是否正在创建语音场 }}
}) => {
  console.log('[FloatingToolbar] Rendering with onCreateNode:', typeof onCreateNode);

  // 状态管理
  const [mode, setMode] = useState<ToolbarMode>('fixed');
  const [position, setPosition] = useState({ x: 0, y: 24 });
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 拖拽相关状态
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const toolbarSizeRef = useRef<{ width: number; height: number }>({ width: 600, height: 60 });

  // {{ AURA: Add - 添加初始化标志，防止在加载状态前保存默认值 }}
  const isInitializedRef = useRef(false);

  // 从localStorage加载状态
  const loadState = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: ToolbarState = JSON.parse(saved);
        // {{ AURA: Modify - 如果有defaultMode，优先使用defaultMode }}
        setMode(defaultMode || state.mode || 'fixed');
        setPosition(state.position || getDefaultState(defaultMode).position);
        setCollapsed(state.collapsed || false);
        console.log('[FloatingToolbar] Loaded state from localStorage:', state);
      } else {
        const defaultState = getDefaultState(defaultMode);
        setMode(defaultState.mode);
        setPosition(defaultState.position);
        console.log('[FloatingToolbar] Using default state');
      }
    } catch (error) {
      console.error('[FloatingToolbar] Failed to load state from localStorage:', error);
      const defaultState = getDefaultState(defaultMode);
      setMode(defaultState.mode);
      setPosition(defaultState.position);
    }
  }, [defaultMode]);

  // 保存状态到localStorage
  const saveState = useCallback(() => {
    try {
      const state: ToolbarState = { mode, position, collapsed };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log('[FloatingToolbar] Saved state to localStorage:', state);
    } catch (error) {
      console.error('[FloatingToolbar] Failed to save state to localStorage:', error);
    }
  }, [mode, position, collapsed]);

  // 组件挂载时加载状态
  useEffect(() => {
    loadState();
  }, [loadState]);

  // {{ AURA: Add - 在状态加载后标记已初始化 }}
  useEffect(() => {
    // 延迟标记初始化，确保loadState的setState已经完成
    const timer = setTimeout(() => {
      isInitializedRef.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // {{ AURA: Modify - 只有在初始化完成后才保存状态 }}
  useEffect(() => {
    if (isInitializedRef.current) {
      saveState();
    }
  }, [mode, position, collapsed, saveState]);

  // {{ AURA: Add - 添加模式切换函数 }}
  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'fixed' ? 'floating' : 'fixed');
  }, []);

  // {{ AURA: Add - 添加折叠切换函数 }}
  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  // {{ AURA: Add - 添加拖拽事件处理函数 }}
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (mode !== 'floating') return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    // {{ AURA: Add - 获取工具栏实际尺寸用于边界计算 }}
    const toolbar = (e.target as HTMLElement).closest('div[class*="z-50"]');
    if (toolbar) {
      const rect = toolbar.getBoundingClientRect();
      toolbarSizeRef.current = {
        width: rect.width,
        height: rect.height
      };
    }
  }, [mode, position]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;

    // {{ AURA: Modify - 使用实际工具栏尺寸计算边界约束，使用Math.floor避免浮点数精度问题 }}
    const { width, height } = toolbarSizeRef.current;
    const boundedX = Math.floor(Math.max(0, Math.min(window.innerWidth - width, newX)));
    const boundedY = Math.floor(Math.max(0, Math.min(window.innerHeight - height, newY)));

    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // {{ AURA: Add - 添加拖拽事件监听 }}
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 计算工具栏的className
  const toolbarClassName = mode === 'fixed'
    ? 'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-orange-200 px-3 py-2 flex items-center gap-1'
    : 'fixed z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-orange-200 px-3 py-2 flex items-center gap-1';

  // 计算工具栏的内联样式
  const toolbarStyle = mode === 'floating'
    ? { left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'default' }
    : {};

  return (
    <div className={toolbarClassName} style={toolbarStyle}>
      {/* {{ AURA: Add - 模式切换按钮 }} */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
        title={mode === 'fixed' ? '切换到浮动模式' : '切换到固定模式'}
      >
        {mode === 'fixed' ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
      </Button>

      <Separator orientation="vertical" className="h-6 bg-orange-200" />

      {/* {{ AURA: Add - 拖拽手柄（仅在浮动模式显示） }} */}
      {mode === 'floating' && (
        <>
          <div
            onMouseDown={handleDragStart}
            className="h-8 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-orange-50 rounded transition-all"
            title="拖拽移动工具栏"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <Separator orientation="vertical" className="h-6 bg-orange-200" />
        </>
      )}

      {/* {{ AURA: Add - 折叠按钮（仅在浮动模式显示） }} */}
      {mode === 'floating' && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
            title={collapsed ? '展开工具栏' : '折叠工具栏'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <Separator orientation="vertical" className="h-6 bg-orange-200" />
        </>
      )}

      {/* {{ AURA: Modify - 工具栏内容（折叠时隐藏） }} */}
      {!collapsed && (
        <>
          {/* 视图控制组 - 常用功能，始终显示 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
            title="缩小 (Ctrl + -)"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
            title="放大 (Ctrl + +)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onResetView}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
            title="重置视图 (Ctrl + 0)"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onFitToScreen}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
            title="适应屏幕 (Ctrl + 1)"
          >
            <Maximize className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 bg-orange-200" />

          {/* {{ AURA: Add - 撤销/重做按钮 }} */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="撤销 (Ctrl + Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="重做 (Ctrl + Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 bg-orange-200" />

          {/* 创建节点下拉菜单 */}
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium h-8 px-3 rounded-md hover:bg-orange-50 hover:text-orange-600 transition-all gap-1 cursor-pointer"
              data-tutorial="create-node-button"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">创建节点</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="start"
                sideOffset={5}
                className="min-w-[220px] bg-white rounded-md shadow-lg border border-orange-200 p-1 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              >
                <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-orange-600" />
                  创建法律节点
                </DropdownMenuPrimitive.Label>
                <DropdownMenuPrimitive.Separator className="bg-orange-100 -mx-1 my-1 h-px" />
                <DropdownMenuPrimitive.Item
                  onClick={() => onCreateNode('legal-case')}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-orange-50 focus:bg-orange-50"
                >
                  <Scale className="w-4 h-4" />
                  <span>案件信息</span>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onClick={() => onCreateNode('legal-person')}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-orange-50 focus:bg-orange-50"
                >
                  <Users className="w-4 h-4" />
                  <span>当事人</span>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onClick={() => onCreateNode('legal-document')}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-orange-50 focus:bg-orange-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>文档证据</span>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onClick={() => onCreateNode('legal-timeline')}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-orange-50 focus:bg-orange-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>时间轴</span>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onClick={() => onCreateNode('legal-process')}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-orange-50 focus:bg-orange-50"
                >
                  <Network className="w-4 h-4" />
                  <span>流程模板</span>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item
                  onClick={() => onCreateNode('legal-ai')}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-orange-50 focus:bg-orange-50"
                >
                  <Brain className="w-4 h-4" />
                  <span>AI助手</span>
                </DropdownMenuPrimitive.Item>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>

          <Separator orientation="vertical" className="h-6 bg-orange-200" />

          {/* 核心功能组 - 常用功能，始终显示 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSmartLayout}
            className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-all"
            title="智能布局 (Ctrl + L)"
            data-tutorial="smart-layout-button"
          >
            <Network className="w-4 h-4" />
          </Button>

          <Button
            variant={isConnecting ? 'default' : 'ghost'}
            size="icon"
            onClick={onConnectionMode}
            className={`h-8 w-8 transition-all ${isConnecting
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'hover:bg-orange-50 hover:text-orange-600'
              }`}
            title={isConnecting ? '取消连接 (Esc)' : '连接节点 (Ctrl + K)'}
            data-tutorial="connect-nodes-button"
          >
            <Target className="w-4 h-4" />
          </Button>

          {/* {{ AURA: Add - 创建语音场按钮 }} */}
          {onCreateVoiceZone && (
            <Button
              variant={isCreatingVoiceZone ? 'default' : 'ghost'}
              size="icon"
              onClick={onCreateVoiceZone}
              className={`h-8 w-8 transition-all ${isCreatingVoiceZone
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'hover:bg-orange-50 hover:text-orange-600'
                }`}
              title={isCreatingVoiceZone ? '取消创建语音场 (Esc)' : '创建语音场'}
            >
              <Mic className="w-4 h-4" />
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 bg-orange-200" />

          {/* AI功能下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-orange-50 hover:text-orange-600 transition-all gap-1"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI功能</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-orange-600" />
                AI智能功能
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAIAnalysis} className="gap-2">
                <Brain className="w-4 h-4" />
                <span>AI分析</span>
                <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-700 text-xs">
                  演示
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRelationDetection} className="gap-2">
                <Network className="w-4 h-4" />
                <span>关系检测</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSmartRecommendation} className="gap-2">
                <Lightbulb className="w-4 h-4" />
                <span>智能推荐</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLegalArticleCitation} className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span>法律条文引用</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 bg-orange-200" />

          {/* {{ AURA: Add - 帮助按钮（重新查看引导） }} */}
          {onRestartTutorial && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestartTutorial}
              className="h-8 px-3 hover:bg-orange-50 hover:text-orange-600 transition-all"
              title="重新查看引导 (Ctrl+Shift+H)"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 bg-orange-200" />

          {/* {{ AURA: Add - 协作控制组件 }} */}
          {onStartCall && onEndCall && onJoinCall && (
            <>
              <CollaborationControl
                participants={participants}
                isCallActive={isCallActive}
                onStartCall={onStartCall}
                onEndCall={onEndCall}
                onJoinCall={onJoinCall}
              />
              <Separator orientation="vertical" className="h-6 bg-orange-200" />
            </>
          )}

          {/* 更多功能下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-orange-50 hover:text-orange-600 transition-all gap-1"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-sm">更多</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>仲裁与协作</DropdownMenuLabel>
              <DropdownMenuItem onClick={onArbitrationPanel} className="gap-2">
                <Gavel className="w-4 h-4" />
                <span>仲裁功能面板</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPermissionManagement} className="gap-2">
                <Shield className="w-4 h-4" />
                <span>权限管理</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>文件操作</DropdownMenuLabel>
              <DropdownMenuItem onClick={onSave} className="gap-2">
                <Save className="w-4 h-4" />
                <span>保存工作区</span>
                <span className="ml-auto text-xs text-gray-400">Ctrl+S</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport} className="gap-2">
                <Download className="w-4 h-4" />
                <span>导出数据</span>
                <span className="ml-auto text-xs text-gray-400">Ctrl+E</span>
              </DropdownMenuItem>

              {/* {{ AURA: Add - 性能监控选项 }} */}
              {onPerformanceMonitor && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>开发工具</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onPerformanceMonitor} className="gap-2">
                    <Activity className="w-4 h-4" />
                    <span>性能监控</span>
                    <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700 text-xs">
                      开发
                    </Badge>
                  </DropdownMenuItem>
                </>
              )}

              {/* {{ AURA: Add - 重新查看引导选项 }} */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>帮助</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  console.log('[FloatingToolbar] 重新查看引导被点击');
                  if (onRestartTutorial) {
                    onRestartTutorial();
                  } else {
                    console.warn('[FloatingToolbar] onRestartTutorial is undefined');
                  }
                }}
                className="gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                <span>重新查看引导</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
});

FloatingToolbar.displayName = 'FloatingToolbar';
