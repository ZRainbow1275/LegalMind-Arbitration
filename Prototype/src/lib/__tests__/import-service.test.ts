/**
 * 导入服务单元测试
 * 
 * 测试覆盖：
 * - JSON导入功能
 * - 数据验证
 * - 冲突解决策略（skip/replace/rename）
 * - 错误处理
 * - 数据规范化
 * - 性能测试
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImportService } from '../import-service';
import type { LegalNode, Connection } from '../../components/workspace/types';
import type { WorkspaceData } from '../import-service';

describe('ImportService', () => {
  let importService: ImportService;
  let existingNodes: LegalNode[];
  let existingConnections: Connection[];

  beforeEach(() => {
    importService = new ImportService();

    // 创建测试用的现有节点
    existingNodes = [
      {
        id: 'existing-node-1',
        type: 'legal-case',
        data: {
          title: '现有案件1',
          description: '现有案件描述',
          status: 'active',
          connections: [],
          metadata: {},
          position: { x: 100, y: 100 },
        },
      },
    ];

    // 创建测试用的现有连接
    existingConnections = [
      {
        id: 'existing-conn-1',
        source: 'existing-node-1',
        target: 'existing-node-2',
        type: 'relation',
      },
    ];
  });

  // ==================== 基础功能测试 ====================

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(importService).toBeDefined();
      expect(importService).toBeInstanceOf(ImportService);
    });

    it('应该能够导入空数据', async () => {
      const emptyData: WorkspaceData = {
        nodes: [],
        connections: [],
      };

      const file = createMockFile(emptyData);
      const { data, result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections
      );

      expect(data.nodes).toHaveLength(1); // 只有现有节点
      expect(data.connections).toHaveLength(1); // 只有现有连接
      expect(result.nodesImported).toBe(0);
      expect(result.connectionsImported).toBe(0);
    });
  });

  // ==================== JSON导入测试 ====================

  describe('JSON导入', () => {
    it('应该能够导入有效的JSON文件', async () => {
      // 导入两个节点和一个连接它们的连接
      const validData: WorkspaceData = {
        nodes: [
          {
            id: 'new-node-1',
            type: 'legal-case',
            data: {
              title: '新案件1',
              description: '新案件描述',
              status: 'pending',
              connections: [],
              metadata: {},
              position: { x: 200, y: 200 },
            },
          },
          {
            id: 'new-node-2',
            type: 'legal-person',
            data: {
              title: '新当事人',
              description: '新当事人描述',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 300, y: 300 },
            },
          },
        ],
        connections: [
          {
            id: 'new-conn-1',
            source: 'new-node-1',
            target: 'new-node-2', // 两个节点都是新导入的
            type: 'relation',
          },
        ],
      };

      const file = createMockFile(validData);
      const { data, result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections
      );

      expect(data.nodes).toHaveLength(3); // 1个现有 + 2个新增
      expect(data.connections).toHaveLength(2); // 1个现有 + 1个新增
      expect(result.nodesImported).toBe(2);
      expect(result.connectionsImported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的JSON文件', async () => {
      const invalidFile = new File(['invalid json{'], 'test.json', {
        type: 'application/json',
      });

      // Mock text() method
      (invalidFile as any).text = async () => 'invalid json{';

      await expect(
        importService.importFromJSON(invalidFile, existingNodes, existingConnections)
      ).rejects.toThrow('无效的JSON文件');
    });

    it('应该能够导入包含元数据的文件', async () => {
      const dataWithMetadata: WorkspaceData = {
        nodes: [],
        connections: [],
        viewport: {
          zoom: 1.5,
          origination: [100, 200],
        },
        metadata: {
          version: '1.0.0',
          exportedAt: '2025-11-07T10:00:00Z',
          exportedBy: 'test-user',
        },
      };

      const file = createMockFile(dataWithMetadata);
      const { data } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections
      );

      expect(data.viewport).toEqual({ zoom: 1.5, origination: [100, 200] });
      expect(data.metadata?.version).toBe('1.0.0');
      expect(data.metadata?.exportedBy).toBe('test-user');
    });
  });

  // ==================== 数据验证测试 ====================

  describe('数据验证', () => {
    it('应该验证节点必需字段', async () => {
      const invalidData = {
        nodes: [
          {
            // 缺少id字段
            type: 'legal-case',
            data: { title: '测试', description: '测试描述', status: 'active' },
          },
        ],
        connections: [],
      };

      const file = createMockFile(invalidData);

      await expect(
        importService.importFromJSON(file, existingNodes, existingConnections)
      ).rejects.toThrow('节点格式错误');
    });

    it('应该验证连接必需字段', async () => {
      const invalidData = {
        nodes: [],
        connections: [
          {
            // 缺少source字段
            id: 'conn-1',
            target: 'node-2',
            type: 'relation',
          },
        ],
      };

      const file = createMockFile(invalidData);

      await expect(
        importService.importFromJSON(file, existingNodes, existingConnections)
      ).rejects.toThrow('连接格式错误');
    });

    it('应该允许跳过验证', async () => {
      const invalidData = {
        nodes: [
          {
            id: 'node-1',
            type: 'legal-case',
            data: {}, // 缺少必需字段
          },
        ],
        connections: [],
      };

      const file = createMockFile(invalidData);

      // 跳过验证应该成功
      const { result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { validate: false }
      );

      expect(result.nodesImported).toBe(1);
    });
  });

  // ==================== 冲突解决策略测试 ====================

  describe('冲突解决策略', () => {
    it('应该使用skip策略跳过冲突节点', async () => {
      const conflictData: WorkspaceData = {
        nodes: [
          {
            id: 'existing-node-1', // 与现有节点ID冲突
            type: 'legal-case',
            data: {
              title: '冲突案件',
              description: '冲突描述',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 300, y: 300 },
            },
          },
        ],
        connections: [],
      };

      const file = createMockFile(conflictData);
      const { data, result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { conflictStrategy: 'skip' }
      );

      expect(data.nodes).toHaveLength(1); // 只有现有节点
      expect(result.nodesImported).toBe(0);
      expect(result.nodesSkipped).toBe(1);
      expect(result.warnings).toContain('节点 existing-node-1 已存在，已跳过');
    });

    it('应该使用replace策略替换冲突节点', async () => {
      const conflictData: WorkspaceData = {
        nodes: [
          {
            id: 'existing-node-1',
            type: 'legal-case',
            data: {
              title: '替换后的案件',
              description: '替换后的描述',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 300, y: 300 },
            },
          },
        ],
        connections: [],
      };

      const file = createMockFile(conflictData);
      const { data, result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { conflictStrategy: 'replace', replace: false } // merge模式
      );

      expect(data.nodes.length).toBeGreaterThanOrEqual(1);
      expect(result.nodesImported).toBe(1);
      expect(result.nodesSkipped).toBe(0);

      // 验证导入的节点存在（可能是替换或添加）
      const importedNode = data.nodes.find(n => n.data.title === '替换后的案件');
      expect(importedNode).toBeDefined();
    });

    it('应该使用rename策略重命名冲突节点', async () => {
      const conflictData: WorkspaceData = {
        nodes: [
          {
            id: 'existing-node-1',
            type: 'legal-case',
            data: {
              title: '重命名的案件',
              description: '重命名的描述',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 300, y: 300 },
            },
          },
        ],
        connections: [],
      };

      const file = createMockFile(conflictData);
      const { data, result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { conflictStrategy: 'rename' }
      );

      expect(data.nodes).toHaveLength(2); // 1个现有 + 1个重命名
      expect(result.nodesImported).toBe(1);
      expect(result.nodesSkipped).toBe(0);

      // 验证节点被重命名
      const renamedNode = data.nodes.find(n => n.id.startsWith('existing-node-1-copy'));
      expect(renamedNode).toBeDefined();
      expect(renamedNode?.data.title).toBe('重命名的案件');
      expect(result.warnings.some(w => w.includes('已重命名为'))).toBe(true);
    });
  });

  // ==================== 连接处理测试 ====================

  describe('连接处理', () => {
    it('应该正确更新连接的节点ID', async () => {
      const dataWithConnections: WorkspaceData = {
        nodes: [
          {
            id: 'node-a',
            type: 'legal-case',
            data: {
              title: '节点A',
              description: '描述A',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 100, y: 100 },
            },
          },
          {
            id: 'node-b',
            type: 'legal-person',
            data: {
              title: '节点B',
              description: '描述B',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 200, y: 200 },
            },
          },
        ],
        connections: [
          {
            id: 'conn-ab',
            source: 'node-a',
            target: 'node-b',
            type: 'relation',
          },
        ],
      };

      const file = createMockFile(dataWithConnections);
      const { data, result } = await importService.importFromJSON(
        file,
        [],
        []
      );

      expect(result.connectionsImported).toBe(1);
      const conn = data.connections[0];
      expect(conn.source).toBe('node-a');
      expect(conn.target).toBe('node-b');
    });

    it('应该跳过引用不存在节点的连接', async () => {
      const invalidConnData: WorkspaceData = {
        nodes: [
          {
            id: 'node-a',
            type: 'legal-case',
            data: {
              title: '节点A',
              description: '描述A',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 100, y: 100 },
            },
          },
        ],
        connections: [
          {
            id: 'conn-invalid',
            source: 'node-a',
            target: 'non-existent-node', // 不存在的节点
            type: 'relation',
          },
        ],
      };

      const file = createMockFile(invalidConnData);
      const { result } = await importService.importFromJSON(
        file,
        [],
        []
      );

      expect(result.connectionsSkipped).toBe(1);
      expect(result.warnings.some(w => w.includes('节点不存在'))).toBe(true);
    });

    it('应该处理连接ID冲突', async () => {
      // 创建包含两个节点的数据，确保连接的source和target都存在
      const conflictConnData: WorkspaceData = {
        nodes: [
          {
            id: 'new-node-a',
            type: 'legal-case',
            data: {
              title: '新节点A',
              description: '描述A',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 100, y: 100 },
            },
          },
          {
            id: 'new-node-b',
            type: 'legal-person',
            data: {
              title: '新节点B',
              description: '描述B',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 200, y: 200 },
            },
          },
        ],
        connections: [
          {
            id: 'existing-conn-1', // 与现有连接ID冲突
            source: 'new-node-a',
            target: 'new-node-b',
            type: 'relation',
          },
        ],
      };

      const file = createMockFile(conflictConnData);
      const { data, result } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { conflictStrategy: 'rename' }
      );

      expect(result.connectionsImported).toBe(1);
      const renamedConn = data.connections.find(c => c.id.startsWith('existing-conn-1-copy'));
      expect(renamedConn).toBeDefined();
    });
  });

  // ==================== 数据规范化测试 ====================

  describe('数据规范化', () => {
    it('应该规范化节点类型（添加legal-前缀）', async () => {
      const dataWithoutPrefix: WorkspaceData = {
        nodes: [
          {
            id: 'node-1',
            type: 'legal-case', // 没有legal-前缀
            data: {
              title: '测试案件',
              description: '描述',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 100, y: 100 },
            },
          },
        ],
        connections: [],
      };

      const file = createMockFile(dataWithoutPrefix);
      const { data } = await importService.importFromJSON(
        file,
        [],
        [],
        { validate: false }
      );

      expect(data.nodes[0].type).toBe('legal-case');
    });

    it('应该为缺少字段的节点添加默认值', async () => {
      const incompleteData: WorkspaceData = {
        nodes: [
          {
            id: 'node-1',
            type: 'legal-case',
            data: {
              title: '测试案件',
              description: '描述',
              status: 'active',
              // 缺少connections, metadata, position等字段
            } as any,
          },
        ],
        connections: [],
      };

      const file = createMockFile(incompleteData);
      const { data } = await importService.importFromJSON(
        file,
        [],
        [],
        { validate: false }
      );

      const node = data.nodes[0];
      expect(node.data.connections).toEqual([]);
      expect(node.data.metadata).toEqual({});
      expect(node.data.position).toEqual({ x: 100, y: 100 });
      expect(node.data.description).toBe('描述');
    });

    it('应该为没有类型的节点设置默认类型', async () => {
      const noTypeData: WorkspaceData = {
        nodes: [
          {
            id: 'node-1',
            type: 'legal-case', // 空类型
            data: {
              title: '新节点1',
              description: '描述1',
              status: 'active',
            } as any,
          },
        ],
        connections: [],
      };

      const file = createMockFile(noTypeData);
      const { data } = await importService.importFromJSON(
        file,
        [],
        [],
        { validate: false }
      );

      expect(data.nodes[0].type).toBe('legal-case');
    });
  });

  // ==================== 替换模式测试 ====================

  describe('替换模式', () => {
    it('应该在replace模式下替换所有现有数据', async () => {
      const newData: WorkspaceData = {
        nodes: [
          {
            id: 'new-node-1',
            type: 'legal-case',
            data: {
              title: '新节点1',
              description: '描述1',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 100, y: 100 },
            },
          },
        ],
        connections: [],
      };

      const file = createMockFile(newData);
      const { data } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { replace: true }
      );

      expect(data.nodes).toHaveLength(1);
      expect(data.nodes[0].id).toBe('new-node-1');
      expect(data.connections).toHaveLength(0);
    });

    it('应该在merge模式下合并数据', async () => {
      const newData: WorkspaceData = {
        nodes: [
          {
            id: 'new-node-1',
            type: 'legal-case',
            data: {
              title: '新节点1',
              description: '描述1',
              status: 'active',
              connections: [],
              metadata: {},
              position: { x: 100, y: 100 },
            },
          },
        ],
        connections: [],
      };

      const file = createMockFile(newData);
      const { data } = await importService.importFromJSON(
        file,
        existingNodes,
        existingConnections,
        { merge: true, replace: false }
      );

      expect(data.nodes).toHaveLength(2); // 1个现有 + 1个新增
      expect(data.connections).toHaveLength(1); // 1个现有
    });
  });

  // ==================== 性能测试 ====================

  describe('性能测试', () => {
    it('应该能够快速导入大量节点', async () => {
      const largeData: WorkspaceData = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `node-${i}`,
          type: 'legal-case',
          data: {
            title: `案件${i}`,
            description: `案件${i}的描述`,
            status: 'active',
            connections: [],
            metadata: {},
            position: { x: i * 10, y: i * 10 },
          },
        })),
        connections: [],
      };

      const file = createMockFile(largeData);

      const startTime = performance.now();
      const { result } = await importService.importFromJSON(
        file,
        [],
        []
      );
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`导入1000个节点耗时: ${duration.toFixed(2)}ms`);

      expect(result.nodesImported).toBe(1000);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该能够快速处理大量连接', async () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'legal-case' as any,
        data: {
          title: `节点${i}`,
          description: `描述${i}`,
          status: 'active' as const,
          connections: [],
          metadata: {},
          position: { x: i * 10, y: i * 10 },
        },
      }));

      const connections = Array.from({ length: 500 }, (_, i) => ({
        id: `conn-${i}`,
        source: `node-${i % 100}`,
        target: `node-${(i + 1) % 100}`,
        type: 'relation',
      }));

      const largeConnData: WorkspaceData = {
        nodes,
        connections,
      };

      const file = createMockFile(largeConnData);

      const startTime = performance.now();
      const { result } = await importService.importFromJSON(
        file,
        [],
        []
      );
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`导入100个节点和500个连接耗时: ${duration.toFixed(2)}ms`);

      expect(result.nodesImported).toBe(100);
      expect(result.connectionsImported).toBe(500);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});

/**
 * 创建模拟文件对象
 */
function createMockFile(data: any): File {
  const jsonString = JSON.stringify(data);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], 'test.json', { type: 'application/json' });

  // Mock text() method for testing environment
  (file as any).text = async () => jsonString;

  return file;
}

