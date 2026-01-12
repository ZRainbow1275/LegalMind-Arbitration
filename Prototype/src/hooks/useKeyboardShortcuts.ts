/**
 * 快捷键系统Hook
 * 提供常用快捷键功能
 */

import { useEffect, useCallback, useState, useMemo } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
  onToggleFullscreen?: () => void;
  onSearch?: () => void;
  onFilter?: () => void; // {{ AURA: Add - 过滤操作 }}
  onHelp?: () => void;
  // {{ AURA: Add - 剪贴板操作 }}
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  // {{ AURA: Add - 导出/导入操作 }}
  onExportImport?: () => void;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const {
    onSave,
    onUndo,
    onRedo,
    onDelete,
    onDuplicate,
    onSelectAll,
    onDeselect,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    onToggleFullscreen,
    onSearch,
    onFilter, // {{ AURA: Add - 解构过滤操作 }}
    onHelp,
    // {{ AURA: Add - 解构剪贴板操作 }}
    onCopy,
    onPaste,
    onCut,
    // {{ AURA: Add - 解构导出/导入操作 }}
    onExportImport,
  } = options;

  // {{ AURA: Add - 快捷键提示面板状态 }}
  const [isShortcutsPanelOpen, setIsShortcutsPanelOpen] = useState(false);

  // {{ AURA: Add - 切换快捷键提示面板 }}
  const toggleShortcutsPanel = useCallback(() => {
    setIsShortcutsPanelOpen(prev => !prev);
  }, []);

  // 快捷键配置
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    // 文件操作
    { key: 's', ctrl: true, description: '保存', action: onSave || (() => { }) },

    // 编辑操作
    { key: 'z', ctrl: true, description: '撤销', action: onUndo || (() => { }) },
    { key: 'z', ctrl: true, shift: true, description: '重做', action: onRedo || (() => { }) },
    { key: 'y', ctrl: true, description: '重做', action: onRedo || (() => { }) },
    { key: 'Delete', description: '删除', action: onDelete || (() => { }) },
    { key: 'd', ctrl: true, description: '复制', action: onDuplicate || (() => { }) },
    { key: 'a', ctrl: true, description: '全选', action: onSelectAll || (() => { }) },
    { key: 'Escape', description: '取消选择', action: onDeselect || (() => { }) },
    // {{ AURA: Add - 剪贴板快捷键 }}
    { key: 'c', ctrl: true, description: '复制', action: onCopy || (() => { }) },
    { key: 'v', ctrl: true, description: '粘贴', action: onPaste || (() => { }) },
    { key: 'x', ctrl: true, description: '剪切', action: onCut || (() => { }) },

    // 视图操作
    { key: '=', ctrl: true, description: '放大', action: onZoomIn || (() => { }) },
    { key: '+', ctrl: true, description: '放大', action: onZoomIn || (() => { }) },
    { key: '-', ctrl: true, description: '缩小', action: onZoomOut || (() => { }) },
    { key: '0', ctrl: true, description: '重置缩放', action: onResetZoom || (() => { }) },
    { key: '1', ctrl: true, description: '适应屏幕', action: onFitToScreen || (() => { }) },
    { key: 'F11', description: '全屏', action: onToggleFullscreen || (() => { }) },

    // 其他操作
    { key: 'f', ctrl: true, description: '搜索', action: onSearch || (() => { }) },
    { key: 'f', ctrl: true, shift: true, description: '过滤', action: onFilter || (() => { }) }, // {{ AURA: Add - 过滤快捷键 }}
    { key: 'e', ctrl: true, shift: true, description: '导出/导入', action: onExportImport || (() => { }) }, // {{ AURA: Add - 导出/导入快捷键 }}
    { key: '?', shift: true, description: '帮助', action: onHelp || toggleShortcutsPanel }, // {{ AURA: Modify - 默认打开快捷键面板 }}
    { key: '?', description: '快捷键提示', action: toggleShortcutsPanel }, // {{ AURA: Add - 单独的?键也可以打开 }}
  ], [
    onSave, onUndo, onRedo, onDelete, onDuplicate, onSelectAll, onDeselect,
    onCopy, onPaste, onCut,
    onZoomIn, onZoomOut, onResetZoom, onFitToScreen, onToggleFullscreen,
    onSearch, onFilter, onExportImport, onHelp, toggleShortcutsPanel
  ]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 忽略输入框中的快捷键
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // 查找匹配的快捷键
    const matchedShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (matchedShortcut) {
      e.preventDefault();
      e.stopPropagation();
      matchedShortcut.action();
    }
  }, [shortcuts]);

  // 注册键盘事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 返回快捷键列表（用于显示帮助）
  return {
    shortcuts: shortcuts,
    // {{ AURA: Add - 快捷键提示面板控制 }}
    isShortcutsPanelOpen,
    toggleShortcutsPanel,
    closeShortcutsPanel: () => setIsShortcutsPanelOpen(false),
  };
};
