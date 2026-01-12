/**
 * 快捷键帮助面板组件
 */

import React, { useEffect } from 'react';
import { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ shortcuts, onClose }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // 过滤快捷键
  const filteredShortcuts = React.useMemo(() => {
    if (!searchQuery.trim()) return shortcuts;
    const query = searchQuery.toLowerCase();
    return shortcuts.filter(s =>
      s.description.toLowerCase().includes(query) ||
      s.key.toLowerCase().includes(query)
    );
  }, [shortcuts, searchQuery]);

  // 按类别分组
  const groupedShortcuts = React.useMemo(() => {
    return {
      '文件操作': filteredShortcuts.filter(s => ['保存'].includes(s.description)),
      '编辑操作': filteredShortcuts.filter(s => ['撤销', '重做', '删除', '复制', '全选', '取消选择'].includes(s.description)),
      '视图操作': filteredShortcuts.filter(s => ['放大', '缩小', '重置缩放', '适应屏幕', '全屏'].includes(s.description)),
      '其他操作': filteredShortcuts.filter(s => ['搜索', '帮助'].includes(s.description)),
    };
  }, [filteredShortcuts]);

  const hasResults = Object.values(groupedShortcuts).some(group => group.length > 0);

  const formatKey = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">键盘快捷键</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索快捷键..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-y-auto flex-1">
          {!hasResults ? (
            <div className="text-center py-8 text-gray-500">
              <p>未找到匹配的快捷键</p>
            </div>
          ) : (
            Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-all hover:translate-x-1"
                      >
                        <span className="text-sm text-gray-700">{shortcut.description}</span>
                        <kbd className="px-3 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
                          {formatKey(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 shrink-0">
          <p className="text-xs text-gray-600 text-center">
            按 <kbd className="px-2 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">ESC</kbd> 关闭此窗口
          </p>
        </div>
      </div>
    </div>
  );
};

