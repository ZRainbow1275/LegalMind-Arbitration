/**
 * 节点搜索面板
 * 
 * 功能：
 * - 全局搜索框（Ctrl+F/Cmd+F）
 * - 实时搜索建议
 * - 搜索结果列表
 * - 搜索历史
 * - 按类型过滤
 * 
 * @author AI Agent
 * @date 2025-11-06
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Clock, Filter, } from 'lucide-react';
import { SearchEngine, type SearchResult } from '../lib/search-engine';
import type { LegalNode } from './workspace/types';

interface NodeSearchPanelProps {
  /** 所有节点 */
  nodes: LegalNode[];
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 选择节点回调 */
  onSelectNode: (node: LegalNode) => void;
  /** 搜索引擎实例 */
  searchEngine?: SearchEngine;
  /** 打开过滤面板回调 */
  onOpenFilter?: () => void;
}

export const NodeSearchPanel: React.FC<NodeSearchPanelProps> = ({
  nodes,
  isOpen,
  onClose,
  onSelectNode,
  searchEngine: externalSearchEngine,
  onOpenFilter,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchEngineRef = useRef<SearchEngine>(externalSearchEngine || new SearchEngine());

  // 更新搜索引擎的节点数据
  useEffect(() => {
    searchEngineRef.current.updateNodes(nodes);
  }, [nodes]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 执行搜索
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    console.log('[NodeSearchPanel] 执行搜索:', searchQuery);
    const searchResults = searchEngineRef.current.search({
      query: searchQuery,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      fuzzy: true,
      limit: 50,
    });

    console.log('[NodeSearchPanel] 搜索结果:', searchResults.length, '个');
    setResults(searchResults);
    setSelectedIndex(0);
  }, [selectedTypes]);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 获取搜索建议
    const newSuggestions = searchEngineRef.current.getSuggestions(value, 5);
    setSuggestions(newSuggestions);
    setShowSuggestions(value.length > 0 && newSuggestions.length > 0);

    // 执行搜索
    performSearch(value);
  }, [performSearch]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        console.log('[NodeSearchPanel] 选择节点:', results[selectedIndex].node);
        onSelectNode(results[selectedIndex].node);
        onClose();
      }
    }
  }, [results, selectedIndex, onSelectNode, onClose]);

  // 处理建议点击
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  }, [performSearch]);

  // 处理类型过滤
  const handleTypeToggle = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      return newTypes;
    });
  }, []);

  // 获取所有节点类型
  const allTypes = Array.from(new Set(nodes.map(node => node.type)));

  // 节点类型显示名称映射
  const typeLabels: Record<string, string> = {
    'legal-case': '案件信息',
    'legal-person': '当事人',
    'legal-document': '文档证据',
    'legal-hearing': '庭审安排',
    'legal-mediation': '调解记录',
    'legal-timeline': '时间轴',
    // 简短类型名映射（用于测试和向后兼容）
    'case': '案件',
    'party': '当事人',
    'document': '文档',
    'hearing': '庭审',
    'timeline': '时间轴',
    'ai': 'AI助手',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/20 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl animate-slide-in-up" data-tutorial="search-panel">
        {/* 搜索框 */}
        <div className="relative p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="搜索节点（标题、描述、内容）..."
              className="flex-1 px-2 py-1 text-lg outline-none"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 rounded"
              title="类型过滤"
            >
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
            {onOpenFilter && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFilter();
                }}
                className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                title="高级过滤 (Ctrl+Shift+F)"
              >
                高级过滤
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* 搜索建议 */}
          {showSuggestions && (
            <div
              data-testid="search-suggestions"
              className="absolute left-4 right-4 top-full mt-1 bg-white border rounded-lg shadow-lg z-10"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 过滤器 */}
        {showFilters && (
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {allTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeToggle(type)}
                  className={`px-3 py-1 rounded-full text-sm ${selectedTypes.includes(type)
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {typeLabels[type] || type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 搜索结果 */}
        <div data-testid="search-results" className="max-h-96 overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <div className="p-8 text-center text-gray-500">
              <p>未找到匹配的节点</p>
              <p className="text-sm mt-2">尝试使用不同的关键词或调整过滤器</p>
            </div>
          )}

          {results.length === 0 && !query.trim() && (
            <div className="p-4">
              {/* 搜索历史 */}
              {searchEngineRef.current.getHistory().length > 0 && (
                <div data-testid="search-history" className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">搜索历史</h3>
                    <button
                      onClick={() => {
                        searchEngineRef.current.clearHistory();
                        setSuggestions([]);
                      }}
                      className="text-xs text-orange-500 hover:text-orange-600"
                    >
                      清空历史
                    </button>
                  </div>
                  <div className="space-y-1">
                    {searchEngineRef.current.getHistory().slice(0, 10).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQuery(item);
                          performSearch(item);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 空状态提示 */}
              <div className="text-center text-gray-500 py-4">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>输入关键词开始搜索</p>
                <p className="text-sm mt-2">支持标题、描述、内容搜索</p>
              </div>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.node.id}
              data-testid={`search-result-${result.node.id}`}
              onClick={() => {
                console.log('[NodeSearchPanel] 点击选择节点:', result.node);
                onSelectNode(result.node);
                onClose();
              }}
              className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-all hover:scale-[1.01] ${index === selectedIndex ? 'bg-orange-50' : ''
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-700">
                      {typeLabels[result.node.type] || result.node.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      匹配度: {Math.round(result.score * 100)}%
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {result.node.data.title}
                  </h3>
                  {result.node.data.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {result.node.data.description}
                    </p>
                  )}
                  {result.matches.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      匹配字段: {result.matches.map(m => m.field).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>↑↓ 导航</span>
            <span>Enter 选择</span>
            <span>Esc 关闭</span>
          </div>
          <div>
            {results.length > 0 && `找到 ${results.length} 个结果`}
          </div>
        </div>
      </div>
    </div>
  );
};

