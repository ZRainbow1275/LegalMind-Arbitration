/**
 * 命令面板
 * 
 * 类似Figma的Ctrl+K命令面板
 */

import React, { useState, useEffect, useRef } from 'react';

// ==================== 类型定义 ====================

export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  category?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

// ==================== 组件 ====================

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 过滤命令
  const filteredCommands = commands.filter(cmd => {
    const searchLower = search.toLowerCase();
    return (
      cmd.name.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.category?.toLowerCase().includes(searchLower)
    );
  });

  // 按类别分组
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || '其他';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 600,
          maxHeight: '60vh',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索命令..."
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 16,
              border: 'none',
              outline: 'none',
              backgroundColor: '#f9fafb',
              borderRadius: 8,
            }}
          />
        </div>

        {/* 命令列表 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
          }}
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              未找到匹配的命令
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#6b7280',
                    padding: '8px 12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <div
                      key={cmd.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        backgroundColor: isSelected ? '#f97316' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {cmd.icon && (
                          <span style={{ fontSize: 20 }}>{cmd.icon}</span>
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>{cmd.name}</div>
                          {cmd.description && (
                            <div
                              style={{
                                fontSize: 12,
                                opacity: 0.8,
                                marginTop: 2,
                              }}
                            >
                              {cmd.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {cmd.shortcut && (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.8,
                            fontFamily: 'monospace',
                          }}
                        >
                          {cmd.shortcut}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid #e5e7eb',
            fontSize: 12,
            color: '#6b7280',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f3f4f6', borderRadius: 4 }}>↑↓</kbd> 导航
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f3f4f6', borderRadius: 4, marginLeft: 8 }}>Enter</kbd> 选择
          </div>
          <div>
            <kbd style={{ padding: '2px 6px', backgroundColor: '#f3f4f6', borderRadius: 4 }}>Esc</kbd> 关闭
          </div>
        </div>
      </div>
    </div>
  );
};

