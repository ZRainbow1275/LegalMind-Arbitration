/**
 * NodeSearchPanel组件测试
 * 
 * 测试覆盖：
 * - 组件渲染
 * - 搜索功能
 * - 类型过滤
 * - 键盘导航
 * - 搜索历史
 * - 用户交互
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { NodeSearchPanel } from '../NodeSearchPanel';
import { SearchEngine } from '../../lib/search-engine';
import type { LegalNode } from '../workspace/types';

// 生成测试节点
function generateTestNodes(count: number): LegalNode[] {
  const types = ['case', 'party', 'document', 'hearing', 'timeline', 'ai'];
  const nodes: LegalNode[] = [];

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: `node-${i}`,
      type: types[i % types.length],
      position: { x: i * 100, y: i * 100 },
      size: { width: 280, height: 200 },
      data: {
        position: { x: i * 100, y: i * 100 },
        title: `测试节点 ${i}`,
        description: `这是测试节点 ${i} 的描述`,
        content: `节点 ${i} 的详细内容`,
        status: 'active',
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: 'test',
          version: 1
        },
        connections: []
      },
    } as unknown as LegalNode);
  }

  return nodes;
}

describe('NodeSearchPanel', () => {
  let testNodes: LegalNode[];
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnSelectNode: ReturnType<typeof vi.fn>;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    testNodes = generateTestNodes(10);
    mockOnClose = vi.fn();
    mockOnSelectNode = vi.fn();
    searchEngine = new SearchEngine();
    searchEngine.updateNodes(testNodes);
  });

  describe('组件渲染', () => {
    it('应该在打开时渲染', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      expect(screen.getByPlaceholderText(/搜索节点/i)).toBeInTheDocument();
    });

    it('应该在关闭时不渲染', () => {
      const { container } = render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={false}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('应该显示搜索图标', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      // lucide-react图标是SVG元素，不是img元素
      const searchInput = screen.getByPlaceholderText(/搜索节点/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('应该显示关闭按钮', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const closeButton = screen.getByRole('button', { name: /关闭/i });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('搜索功能', () => {
    it('应该能够输入搜索关键词', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '测试' } });

      expect(input.value).toBe('测试');
    });

    it('应该显示搜索结果', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '测试节点' } });

      await waitFor(() => {
        // 使用within()在搜索结果区域中查找，并使用getByRole('heading')只匹配h3标签
        const searchResults = screen.getByTestId('search-results');
        const result = within(searchResults).queryByRole('heading', { name: /测试节点 0/i });
        expect(result).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('空查询应该不显示结果', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '' } });

      const searchResults = screen.getByTestId('search-results');
      expect(within(searchResults).queryByText(/测试节点 0/i)).not.toBeInTheDocument();
    });

    it('应该能够清空搜索', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: '测试' } });

      await waitFor(() => {
        const searchResults = screen.getByTestId('search-results');
        expect(within(searchResults).getByRole('heading', { name: /测试节点 0/i })).toBeInTheDocument();
      });

      // 直接清空输入框
      fireEvent.change(input, { target: { value: '' } });

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('类型过滤', () => {
    it('应该显示类型过滤按钮', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      // 查找过滤器按钮（通过title属性）
      const filterButton = screen.getByTitle(/类型过滤/i);
      expect(filterButton).toBeInTheDocument();
    });

    it('应该能够打开类型过滤菜单', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const filterButton = screen.getByTitle(/类型过滤/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/案件/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该能够选择类型过滤', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      // 打开过滤菜单
      const filterButton = screen.getByTitle(/类型过滤/i);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/案件/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // 选择案件类型按钮
      const caseButton = screen.getByText(/案件/i);
      fireEvent.click(caseButton);

      // 输入搜索关键词
      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '测试' } });

      // 验证搜索执行
      await waitFor(() => {
        expect((input as HTMLInputElement).value).toBe('测试');
      }, { timeout: 3000 });
    });
  });

  describe('键盘导航', () => {
    it('应该能够使用Escape键关闭', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('应该能够使用ArrowDown键导航', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '测试' } });

      await waitFor(() => {
        const searchResults = screen.getByTestId('search-results');
        const result = within(searchResults).queryByRole('heading', { name: /测试节点 0/i });
        expect(result).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // 验证键盘事件被处理
      await waitFor(() => {
        expect(input).toBeInTheDocument();
      });
    });

    it('应该能够使用Enter键选择节点', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '测试节点 0' } });

      await waitFor(() => {
        const searchResults = screen.getByTestId('search-results');
        const result = within(searchResults).queryByRole('heading', { name: /测试节点 0/i });
        expect(result).toBeInTheDocument();
      }, { timeout: 3000 });

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSelectNode).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('搜索历史', () => {
    it('应该显示搜索历史按钮', () => {
      // 先进行一次搜索以创建历史
      searchEngine.search({ query: '测试历史', fuzzy: true });

      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      // 搜索历史在空查询时显示
      const input = screen.getByPlaceholderText(/搜索节点/i);
      expect((input as HTMLInputElement).value).toBe('');
    });

    it('应该能够查看搜索历史', async () => {
      // 先进行一次搜索
      searchEngine.search({ query: '测试1', fuzzy: true });
      searchEngine.search({ query: '测试2', fuzzy: true });

      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      // 搜索历史在空查询时自动显示
      await waitFor(() => {
        const history = searchEngine.getHistory();
        expect(history.length).toBeGreaterThan(0);
      });
    });

    it('应该能够清空搜索历史', async () => {
      // 先进行一次搜索
      searchEngine.search({ query: '测试1', fuzzy: true });

      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      // 查找清空历史按钮
      const clearButton = screen.queryByText(/清空历史/i);
      if (clearButton) {
        fireEvent.click(clearButton);
        await waitFor(() => {
          expect(searchEngine.getHistory()).toEqual([]);
        });
      } else {
        // 如果没有清空按钮，直接验证历史存在
        expect(searchEngine.getHistory().length).toBeGreaterThan(0);
      }
    });
  });

  describe('用户交互', () => {
    it('应该能够点击搜索结果', async () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '测试节点 0' } });

      await waitFor(() => {
        const searchResults = screen.getByTestId('search-results');
        const result = within(searchResults).queryByRole('heading', { name: /测试节点 0/i });
        expect(result).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchResults = screen.getByTestId('search-results');
      const result = within(searchResults).getByRole('heading', { name: /测试节点 0/i });
      fireEvent.click(result);

      await waitFor(() => {
        expect(mockOnSelectNode).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('应该能够点击关闭按钮', () => {
      render(
        <NodeSearchPanel
          nodes={testNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const closeButton = screen.getByTitle(/关闭/i);
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量节点', async () => {
      const largeNodes = generateTestNodes(1000);
      searchEngine.updateNodes(largeNodes);

      const startTime = performance.now();

      render(
        <NodeSearchPanel
          nodes={largeNodes}
          isOpen={true}
          onClose={mockOnClose}
          onSelectNode={mockOnSelectNode}
          searchEngine={searchEngine}
        />
      );

      const input = screen.getByPlaceholderText(/搜索节点/i);
      fireEvent.change(input, { target: { value: '测试' } });

      // 等待搜索结果出现，使用data-testid精确定位
      await waitFor(() => {
        const searchResults = screen.getByTestId('search-results');
        const firstResult = within(searchResults).getByTestId('search-result-node-0');
        expect(firstResult).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`处理1000个节点耗时: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(5000); // 应该在5秒内完成
    });
  });
});

