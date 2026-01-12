/**
 * 快捷键管理系统
 * 
 * 提供Figma级别的快捷键支持
 */

import { useEffect, useCallback } from 'react';

// ==================== 类型定义 ====================

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command键（Mac）
  description: string;
  action: () => void;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: ShortcutConfig[];
}

// ==================== 快捷键匹配 ====================

function matchesShortcut(event: KeyboardEvent, config: ShortcutConfig): boolean {
  // 检查修饰键
  if (config.ctrl && !event.ctrlKey) return false;
  if (config.shift && !event.shiftKey) return false;
  if (config.alt && !event.altKey) return false;
  if (config.meta && !event.metaKey) return false;
  
  // 检查按键
  const key = event.key.toLowerCase();
  const configKey = config.key.toLowerCase();
  
  return key === configKey;
}

// ==================== Hook ====================

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 如果在输入框中，不处理快捷键
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    // 查找匹配的快捷键
    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// ==================== 预定义快捷键组 ====================

export function getCanvasShortcuts(actions: {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  cut: () => void;
  delete: () => void;
  selectAll: () => void;
  duplicate: () => void;
  group: () => void;
  ungroup: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  rotateClockwise?: () => void;
  rotateCounterClockwise?: () => void;
}): ShortcutGroup[] {
  return [
    {
      name: '编辑',
      shortcuts: [
        {
          key: 'z',
          ctrl: true,
          description: '撤销',
          action: actions.undo,
        },
        {
          key: 'z',
          ctrl: true,
          shift: true,
          description: '重做',
          action: actions.redo,
        },
        {
          key: 'y',
          ctrl: true,
          description: '重做',
          action: actions.redo,
        },
        {
          key: 'c',
          ctrl: true,
          description: '复制',
          action: actions.copy,
        },
        {
          key: 'v',
          ctrl: true,
          description: '粘贴',
          action: actions.paste,
        },
        {
          key: 'x',
          ctrl: true,
          description: '剪切',
          action: actions.cut,
        },
        {
          key: 'Delete',
          description: '删除',
          action: actions.delete,
        },
        {
          key: 'Backspace',
          description: '删除',
          action: actions.delete,
        },
        {
          key: 'a',
          ctrl: true,
          description: '全选',
          action: actions.selectAll,
        },
        {
          key: 'd',
          ctrl: true,
          description: '复制',
          action: actions.duplicate,
        },
      ],
    },
    {
      name: '组合',
      shortcuts: [
        {
          key: 'g',
          ctrl: true,
          description: '组合',
          action: actions.group,
        },
        {
          key: 'g',
          ctrl: true,
          shift: true,
          description: '取消组合',
          action: actions.ungroup,
        },
      ],
    },
    {
      name: '层级',
      shortcuts: [
        {
          key: ']',
          ctrl: true,
          description: '置于顶层',
          action: actions.bringToFront,
        },
        {
          key: '[',
          ctrl: true,
          description: '置于底层',
          action: actions.sendToBack,
        },
      ],
    },
    {
      name: '变换',
      shortcuts: [
        ...(actions.rotateClockwise ? [{
          key: 'r',
          ctrl: true,
          description: '顺时针旋转15°',
          action: actions.rotateClockwise,
        }] : []),
        ...(actions.rotateCounterClockwise ? [{
          key: 'r',
          ctrl: true,
          shift: true,
          description: '逆时针旋转15°',
          action: actions.rotateCounterClockwise,
        }] : []),
      ],
    },
    {
      name: '对齐',
      shortcuts: [
        {
          key: 'ArrowLeft',
          ctrl: true,
          alt: true,
          description: '左对齐',
          action: actions.alignLeft,
        },
        {
          key: 'ArrowRight',
          ctrl: true,
          alt: true,
          description: '右对齐',
          action: actions.alignRight,
        },
        {
          key: 'ArrowUp',
          ctrl: true,
          alt: true,
          description: '顶对齐',
          action: actions.alignTop,
        },
        {
          key: 'ArrowDown',
          ctrl: true,
          alt: true,
          description: '底对齐',
          action: actions.alignBottom,
        },
      ],
    },
    {
      name: '视图',
      shortcuts: [
        {
          key: '+',
          ctrl: true,
          description: '放大',
          action: actions.zoomIn,
        },
        {
          key: '-',
          ctrl: true,
          description: '缩小',
          action: actions.zoomOut,
        },
        {
          key: '0',
          ctrl: true,
          description: '重置缩放',
          action: actions.resetZoom,
        },
        {
          key: '1',
          ctrl: true,
          description: '适应画布',
          action: actions.zoomToFit,
        },
      ],
    },
  ];
}

// ==================== 快捷键显示 ====================

export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = [];
  
  if (config.ctrl) parts.push('Ctrl');
  if (config.shift) parts.push('Shift');
  if (config.alt) parts.push('Alt');
  if (config.meta) parts.push('Cmd');
  
  // 格式化按键名称
  let keyName = config.key;
  if (keyName === 'ArrowLeft') keyName = '←';
  if (keyName === 'ArrowRight') keyName = '→';
  if (keyName === 'ArrowUp') keyName = '↑';
  if (keyName === 'ArrowDown') keyName = '↓';
  if (keyName === 'Delete') keyName = 'Del';
  if (keyName === 'Backspace') keyName = '⌫';
  
  parts.push(keyName.toUpperCase());
  
  return parts.join('+');
}

