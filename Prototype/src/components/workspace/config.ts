/**
 * LegalMind法律工作台 - 配置文件
 * 
 * 本文件包含工作台组件使用的所有配置常量
 */

import {
  Scale,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  Target,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

/**
 * 节点类型配置
 * 定义每种法律节点的图标、颜色和标签
 */
export const NODE_TYPE_CONFIG = {
  'legal-case': { icon: Scale, color: 'bg-blue-500', label: '案件信息' },
  'legal-person': { icon: Users, color: 'bg-green-500', label: '当事人' },
  'legal-document': { icon: FileText, color: 'bg-purple-500', label: '文档' },
  'legal-evidence': { icon: FileCheck, color: 'bg-indigo-600', label: '证据' },
  'legal-issue': { icon: AlertCircle, color: 'bg-rose-500', label: '争议焦点' },
  'legal-hearing': { icon: Calendar, color: 'bg-orange-500', label: '庭审安排' },
  'legal-mediation': { icon: MessageSquare, color: 'bg-yellow-500', label: '调解记录' },
  'legal-timeline': { icon: Target, color: 'bg-red-500', label: '时间轴' },
  'legal-process': { icon: Target, color: 'bg-cyan-500', label: '流程' },
  'legal-ai-assistant': { icon: Target, color: 'bg-gray-500', label: 'AI助手' }
} as const;

/**
 * Plait配置选项
 * 完全禁用Plait的滚动和交互，使用自定义的画布拖拽和节点拖拽
 */
export const PLAIT_OPTIONS = {
  readonly: false,
  hideScrollbar: true,
  disabledScrollOnNonFocus: false, // Enable scrolling even when not focused
  panWithScroll: true, // Enable panning with scroll wheel/touchpad
} as const;

import { withMind } from '@plait/mind';
import { withDraw } from '@plait/draw';

/**
 * 插件配置
 * 启用核心Drawnix插件以支持思维导图和绘图功能
 */
export const PLAIT_PLUGINS = [withMind, withDraw] as const;

