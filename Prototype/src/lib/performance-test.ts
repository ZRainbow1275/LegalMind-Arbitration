/**
 * 性能测试工具
 * 
 * 用于测试和验证优化效果
 */

import { aiRecommendation } from './ai-recommendation';
import { canvasIntelligence } from './canvas-intelligence';
import { smartLayoutEngine } from './smart-layout-engine';
import { performanceMonitor } from './performance-monitor';
import { cacheManager } from './cache-manager';
import { CanvasState } from '../interfaces/case-canvas-mapping';
import { createLegalCaseNode, createLegalPersonNode, createLegalDocumentNode } from '../interfaces/legal-elements';
import { formatPerformanceReport, checkPerformanceIssues } from './performance-monitor';

/**
 * 创建法律节点辅助函数
 */
function createLegalNode(type: string, position: { x: number, y: number }, data: any) {
  const points: [[number, number], [number, number]] = [[position.x, position.y], [position.x + 100, position.y + 50]];
  switch (type) {
    case 'legal-case':
      return createLegalCaseNode(points, { title: data.name, description: data.description, metadata: data });
    case 'legal-person':
      return createLegalPersonNode(points, { title: data.name, description: '', metadata: data });
    case 'legal-document':
      return createLegalDocumentNode(points, { title: data.name, description: '', metadata: { ...data, documentId: 'doc-' + Date.now(), fileName: data.name, fileSize: 0, fileType: 'txt', documentType: 'evidence', uploadedBy: 'test', uploadDate: new Date().toISOString(), isPublic: false, accessLevel: 'private' } });
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * 生成测试数据
 */
function generateTestData(nodeCount: number): CanvasState {
  const nodes = [];
  const connections = [];

  // 生成案件节点
  nodes.push(
    createLegalNode('legal-case', { x: 500, y: 100 }, {
      name: '测试案件',
      description: '这是一个测试案件',
      caseNumber: 'TEST-2024-001',
    })
  );

  // 生成当事人节点
  for (let i = 0; i < Math.min(nodeCount / 3, 10); i++) {
    nodes.push(
      createLegalNode('legal-person', { x: 200 + i * 100, y: 300 }, {
        name: `当事人${i + 1}`,
        role: i % 2 === 0 ? 'applicant' : 'respondent',
      })
    );
  }

  // 生成文档节点
  for (let i = 0; i < Math.min(nodeCount / 2, 20); i++) {
    nodes.push(
      createLegalNode('legal-document', { x: 100 + i * 80, y: 500 }, {
        name: `文档${i + 1}`,
        tags: ['证据', '合同'],
      })
    );
  }

  // 生成连接
  for (let i = 1; i < nodes.length; i++) {
    if (Math.random() > 0.5) {
      connections.push({
        id: `conn-${i}`,
        source: nodes[0].id,
        target: nodes[i].id,
        type: 'related' as any,
      });
    }
  }

  return {
    nodes,
    connections,
    viewport: { zoom: 1, x: 0, y: 0 },
    metadata: {
      version: '1.0.0',
      editCount: 0,
      custom: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
  };
}

/**
 * 测试AI推荐性能
 */
export async function testAIRecommendation(nodeCount: number = 50): Promise<void> {
  console.log('\n=== 测试AI推荐性能 ===');
  console.log(`节点数量: ${nodeCount}`);

  const state = generateTestData(nodeCount);
  const caseData = {
    id: 'test-001',
    title: '测试案件',
    applicant: '申请人',
    respondent: '被申请人',
  };

  // 清除缓存
  cacheManager.clear();

  // 首次查询（无缓存）
  console.log('\n首次查询（无缓存）:');
  const recommendations1 = await aiRecommendation.getRecommendations(
    'test-001',
    state,
    caseData
  );
  console.log(`推荐数量: ${recommendations1.length}`);

  // 第二次查询（有缓存）
  console.log('\n第二次查询（有缓存）:');
  const recommendations2 = await aiRecommendation.getRecommendations(
    'test-001',
    state,
    caseData
  );
  console.log(`推荐数量: ${recommendations2.length}`);

  // 打印缓存统计
  cacheManager.printStats();
}

/**
 * 测试搜索性能
 */
export async function testSearchPerformance(nodeCount: number = 100): Promise<void> {
  console.log('\n=== 测试搜索性能 ===');
  console.log(`节点数量: ${nodeCount}`);

  const state = generateTestData(nodeCount);

  // 测试搜索
  const queries = ['当事人', '文档', '申请人', '证据', '合同'];

  for (const query of queries) {
    console.log(`\n搜索: "${query}"`);
    const results = canvasIntelligence.search(state, query);
    console.log(`结果数量: ${results.length}`);
  }
}

/**
 * 测试布局性能
 */
export async function testLayoutPerformance(nodeCount: number = 50): Promise<void> {
  console.log('\n=== 测试布局性能 ===');
  console.log(`节点数量: ${nodeCount}`);

  const state = generateTestData(nodeCount);

  // 测试不同布局算法
  const layouts = [
    'hierarchical',
    'force',
    'circular',
    'grid',
    'tree',
    'radial',
  ] as const;

  for (const layout of layouts) {
    console.log(`\n测试 ${layout} 布局:`);
    const layoutedNodes = smartLayoutEngine.applyLayout(
      state.nodes,
      state.connections,
      { type: layout }
    );
    console.log(`布局完成，节点数量: ${layoutedNodes.length}`);
  }
}

/**
 * 运行所有性能测试
 */
export async function runAllPerformanceTests(): Promise<void> {
  console.log('\n========================================');
  console.log('开始性能测试');
  console.log('========================================');

  // 清除之前的性能数据
  performanceMonitor.clear();
  cacheManager.clear();

  // 测试AI推荐
  await testAIRecommendation(50);

  // 测试搜索
  await testSearchPerformance(100);

  // 测试布局
  await testLayoutPerformance(50);

  // 打印性能报告
  console.log('\n========================================');
  console.log('性能测试完成');
  console.log('========================================');

  console.log(formatPerformanceReport(performanceMonitor.generateReport()));
  const warnings = checkPerformanceIssues(performanceMonitor.generateReport());
  warnings.forEach(w => console.warn(w));

  console.log('\n缓存统计:');
  cacheManager.printStats();
}

/**
 * 压力测试
 */
export async function stressTest(): Promise<void> {
  console.log('\n=== 压力测试 ===');

  const nodeCounts = [10, 50, 100, 200, 500];

  for (const nodeCount of nodeCounts) {
    console.log(`\n测试 ${nodeCount} 个节点:`);

    const state = generateTestData(nodeCount);

    // AI推荐
    performanceMonitor.start(`AI推荐-${nodeCount}节点`, 'operation');
    await aiRecommendation.getRecommendations('test-001', state);
    performanceMonitor.end(`AI推荐-${nodeCount}节点`);

    // 搜索
    performanceMonitor.start(`搜索-${nodeCount}节点`, 'operation');
    canvasIntelligence.search(state, '当事人');
    performanceMonitor.end(`搜索-${nodeCount}节点`);

    // 布局
    performanceMonitor.start(`力导向布局-${nodeCount}节点`, 'operation');
    smartLayoutEngine.applyLayout(state.nodes, state.connections, { type: 'force' });
    performanceMonitor.end(`力导向布局-${nodeCount}节点`);
  }

  console.log('\n压力测试完成');
  console.log(formatPerformanceReport(performanceMonitor.generateReport()));
}

/**
 * 内存测试
 */
export async function memoryTest(): Promise<void> {
  console.log('\n=== 内存测试 ===');

  // 检查内存使用
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    console.log(`已用堆内存: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`总堆内存: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`堆内存限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  } else {
    console.log('浏览器不支持内存监控');
  }

  // 测试缓存内存使用
  console.log('\n测试缓存内存使用:');
  cacheManager.clear();

  for (let i = 0; i < 100; i++) {
    const state = generateTestData(50);
    cacheManager.set(`test-${i}`, state, 60000);
  }

  cacheManager.printStats();

  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    console.log(`\n缓存后已用堆内存: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }

  // 清理缓存
  cacheManager.clear();

  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    console.log(`清理后已用堆内存: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }
}

