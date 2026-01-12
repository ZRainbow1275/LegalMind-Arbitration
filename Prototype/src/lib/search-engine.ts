/**
 * 节点搜索引擎
 * 
 * 功能：
 * - 模糊搜索（Fuse.js）
 * - 全文搜索
 * - 按类型过滤
 * - 搜索历史
 * - 搜索建议
 * 
 * @author AI Agent
 * @date 2025-11-06
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import type { LegalNode } from '../components/workspace/types';

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 搜索关键词 */
  query: string;
  /** 节点类型过滤 */
  types?: string[];
  /** 是否模糊搜索 */
  fuzzy?: boolean;
  /** 最大结果数 */
  limit?: number;
  /** 搜索字段 */
  fields?: ('title' | 'description' | 'content')[];
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 匹配的节点 */
  node: LegalNode;
  /** 匹配分数（0-1，越高越匹配） */
  score: number;
  /** 匹配的字段 */
  matches: {
    field: string;
    value: string;
    indices: readonly [number, number][];
  }[];
}

/**
 * 搜索引擎类
 */
export class SearchEngine {
  private fuse: Fuse<LegalNode> | null = null;
  private nodes: LegalNode[] = [];
  private searchHistory: string[] = [];
  private maxHistorySize = 20;

  /**
   * 更新节点数据
   */
  updateNodes(nodes: LegalNode[]): void {
    console.log('[SearchEngine] 更新节点数据:', nodes.length, '个节点');
    this.nodes = nodes;

    // 配置Fuse.js
    const fuseOptions: IFuseOptions<LegalNode> = {
      keys: [
        { name: 'data.title', weight: 0.5 },
        { name: 'data.description', weight: 0.3 },
        { name: 'data.content', weight: 0.2 },
      ],
      threshold: 0.4, // 0.0 = 完全匹配, 1.0 = 匹配任何内容
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true, // 忽略匹配位置，提高召回率
    };

    this.fuse = new Fuse(nodes, fuseOptions);
    console.log('[SearchEngine] Fuse.js已初始化');
  }

  /**
   * 搜索节点
   */
  search(options: SearchOptions): SearchResult[] {
    const {
      query,
      types,
      fuzzy = true,
      limit = 50,
      fields = ['title', 'description', 'content'],
    } = options;

    console.log('[SearchEngine] 搜索:', query, '模糊:', fuzzy, '类型:', types);

    if (!query.trim()) {
      console.log('[SearchEngine] 空查询，返回空结果');
      return [];
    }

    // 添加到搜索历史
    this.addToHistory(query);

    let results: SearchResult[];

    if (fuzzy && this.fuse) {
      // 模糊搜索
      console.log('[SearchEngine] 使用Fuse.js模糊搜索');
      const fuseResults = this.fuse.search(query, { limit });
      console.log('[SearchEngine] Fuse.js返回:', fuseResults.length, '个结果');
      results = fuseResults.map(result => ({
        node: result.item,
        score: 1 - (result.score || 0), // 转换为0-1分数，越高越好
        matches: (result.matches || []).map(match => ({
          field: match.key || '',
          value: match.value || '',
          indices: match.indices || [],
        })),
      }));
    } else {
      // 精确搜索
      const lowerQuery = query.toLowerCase();
      results = this.nodes
        .map(node => {
          const matches: SearchResult['matches'] = [];
          let score = 0;

          // 检查标题
          if (fields.includes('title') && node.data.title) {
            const title = node.data.title.toLowerCase();
            if (title.includes(lowerQuery)) {
              score += 0.5;
              matches.push({
                field: 'title',
                value: node.data.title,
                indices: [[title.indexOf(lowerQuery), title.indexOf(lowerQuery) + query.length]],
              });
            }
          }

          // 检查描述
          if (fields.includes('description') && node.data.description) {
            const desc = node.data.description.toLowerCase();
            if (desc.includes(lowerQuery)) {
              score += 0.3;
              matches.push({
                field: 'description',
                value: node.data.description,
                indices: [[desc.indexOf(lowerQuery), desc.indexOf(lowerQuery) + query.length]],
              });
            }
          }

          // 检查内容
          if (fields.includes('content') && (node.data as any).content) {
            const content = ((node.data as any).content as string).toLowerCase();
            if (content.includes(lowerQuery)) {
              score += 0.2;
              matches.push({
                field: 'content',
                value: (node.data as any).content,
                indices: [[content.indexOf(lowerQuery), content.indexOf(lowerQuery) + query.length]],
              });
            }
          }

          return { node, score, matches };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    // 按类型过滤
    if (types && types.length > 0) {
      results = results.filter(result => types.includes(result.node.type));
    }

    return results;
  }

  /**
   * 获取搜索建议
   */
  getSuggestions(query: string, limit: number = 5): string[] {
    if (!query.trim()) {
      return this.searchHistory.slice(0, limit);
    }

    const lowerQuery = query.toLowerCase();

    // 从历史记录中查找匹配的建议
    const historySuggestions = this.searchHistory
      .filter(item => item.toLowerCase().includes(lowerQuery))
      .slice(0, limit);

    // 从节点标题中提取建议
    const titleSuggestions = this.nodes
      .map(node => node.data.title)
      .filter(title => title && title.toLowerCase().includes(lowerQuery))
      .slice(0, limit - historySuggestions.length);

    return [...new Set([...historySuggestions, ...titleSuggestions])];
  }

  /**
   * 添加到搜索历史
   */
  private addToHistory(query: string): void {
    // 移除重复项
    this.searchHistory = this.searchHistory.filter(item => item !== query);

    // 添加到开头
    this.searchHistory.unshift(query);

    // 限制历史记录大小
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取搜索历史
   */
  getHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * 清空搜索历史
   */
  clearHistory(): void {
    this.searchHistory = [];
  }

  /**
   * 高亮搜索结果
   */
  highlightMatches(text: string, matches: SearchResult['matches']): string {
    if (!matches || matches.length === 0) {
      return text;
    }

    // 收集所有匹配的索引
    const allIndices: [number, number][] = [];
    matches.forEach(match => {
      allIndices.push(...match.indices);
    });

    // 按起始位置排序
    allIndices.sort((a, b) => a[0] - b[0]);

    // 合并重叠的索引
    const mergedIndices: [number, number][] = [];
    let current = allIndices[0];
    for (let i = 1; i < allIndices.length; i++) {
      const next = allIndices[i];
      if (next[0] <= current[1]) {
        // 重叠，合并
        current = [current[0], Math.max(current[1], next[1])];
      } else {
        mergedIndices.push(current);
        current = next;
      }
    }
    if (current) {
      mergedIndices.push(current);
    }

    // 构建高亮文本
    let result = '';
    let lastIndex = 0;
    mergedIndices.forEach(([start, end]) => {
      result += text.slice(lastIndex, start);
      result += `<mark>${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    });
    result += text.slice(lastIndex);

    return result;
  }
}

/**
 * 全局搜索引擎实例
 */
export const globalSearchEngine = new SearchEngine();
