/**
 * 快捷键提示面板
 * 
 * 显示所有可用快捷键，支持搜索和分类
 * 
 * 功能：
 * - 快捷键分类显示
 * - 快捷键搜索
 * - 快捷键高亮
 * - 响应式布局
 * 
 * @author AI Agent
 * @date 2025-10-31
 */

import React, { useState, useMemo } from 'react';
import { X, Search, Command } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

import { KeyboardShortcut, ALL_SHORTCUTS } from '../../config/keyboardShortcuts';

/**
 * 快捷键提示面板Props
 */
export interface KeyboardShortcutsPanelProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 快捷键提示面板组件
 */
export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤快捷键
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return ALL_SHORTCUTS;
    }

    const query = searchQuery.toLowerCase();
    return ALL_SHORTCUTS.filter(
      (shortcut) =>
        shortcut.name.toLowerCase().includes(query) ||
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.keys.some((key) => key.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // 按分类分组
  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, KeyboardShortcut[]> = {};

    filteredShortcuts.forEach((shortcut) => {
      if (!groups[shortcut.category]) {
        groups[shortcut.category] = [];
      }
      groups[shortcut.category].push(shortcut);
    });

    return groups;
  }, [filteredShortcuts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="flex items-center gap-3">
            <Command className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">快捷键提示</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索快捷键..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* 快捷键列表 */}
        <ScrollArea className="h-[500px]">
          <div className="px-6 py-4">
            {Object.keys(groupedShortcuts).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                未找到匹配的快捷键
              </div>
            ) : (
              Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {shortcut.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {shortcut.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          {shortcut.keys.map((key, index) => (
                            <React.Fragment key={index}>
                              {index > 0 && (
                                <span className="text-gray-400 mx-1">+</span>
                              )}
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* 底部提示 */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            按 <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded shadow-sm">?</kbd> 随时打开此面板
          </p>
        </div>
      </div>
    </div>
  );
};

