/**
 * 性能验证页面
 * 
 * 用于验证虚拟滚动和连接线渲染优化的性能
 * 
 * 测试场景：
 * 1. 虚拟滚动优化验证（1000+节点）
 * 2. 连接线渲染优化验证（1000+连接线）
 * 3. QuadTree空间索引验证
 * 4. Web Worker集成测试
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAdvancedVirtualization } from '@/hooks/useAdvancedVirtualization';
import { ConnectionRendererOptimized } from '@/lib/connection-renderer-optimized';
import { PathPoint } from '@/lib/connection-system';

// 生成测试节点
function generateTestNodes(count: number) {
  const nodes = [];
  const gridSize = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;

    nodes.push({
      id: `node-${i}`,
      type: 'legal-case',
      position: {
        x: col * 400 + Math.random() * 100,
        y: row * 300 + Math.random() * 100,
      },
      size: {
        width: 280,
        height: 200,
      },
      data: {
        position: {
          x: col * 400 + Math.random() * 100,
          y: row * 300 + Math.random() * 100,
        },
        title: `测试节点 ${i}`,
        content: `这是测试节点 ${i} 的内容`,
      },
    });
  }

  return nodes;
}

// 生成测试连接线
function generateTestConnections(nodes: any[], count: number) {
  const connections = [];

  for (let i = 0; i < count && i < nodes.length - 1; i++) {
    const fromNode = nodes[i];
    const toNode = nodes[Math.min(i + 1, nodes.length - 1)];

    const points: PathPoint[] = [
      { x: fromNode.data.position.x + 140, y: fromNode.data.position.y + 100, type: 'start' },
      { x: (fromNode.data.position.x + toNode.data.position.x) / 2, y: fromNode.data.position.y + 100, type: 'control' },
      { x: toNode.data.position.x + 140, y: toNode.data.position.y + 100, type: 'end' },
    ];

    connections.push({
      id: `connection-${i}`,
      points,
      style: {
        strokeColor: '#FF6B35',
        strokeWidth: 2,
        opacity: 0.8,
        showArrow: true,
        arrowSize: 10,
      },
      label: `连接 ${i}`,
    });
  }

  return connections;
}

export const PerformanceVerificationPage: React.FC = () => {
  const [nodeCount, setNodeCount] = useState(100);
  const [connectionCount, setConnectionCount] = useState(100);
  const [viewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [canvasSize] = useState({ width: 1920, height: 1080 });
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ConnectionRendererOptimized | null>(null);

  // 生成测试数据
  const testNodes = useMemo(() => generateTestNodes(nodeCount), [nodeCount]);
  const testConnections = useMemo(() => generateTestConnections(testNodes, connectionCount), [testNodes, connectionCount]);

  // 虚拟滚动测试
  const {

    totalNodes,
    visibleCount,
    culledCount,
    cacheHitRate,
    performanceMetrics,
  } = useAdvancedVirtualization(testNodes as any, {
    viewport,
    canvasSize,
    padding: 200,
    enableCache: true,
    enableIncrementalUpdate: true,
    enableAdaptivePadding: true,
  });

  // 初始化连接线渲染器
  useEffect(() => {
    rendererRef.current = new ConnectionRendererOptimized({
      enableVirtualization: true,
      enablePathCache: true,
      padding: 200,
    });

    return () => {
      rendererRef.current?.clearCache();
    };
  }, []);

  // 运行性能测试
  const runPerformanceTest = async () => {
    setIsRunning(true);
    const results = [];

    try {
      // 测试1: 连接线渲染性能（不同连接线数量）
      const canvas = canvasRef.current;
      if (canvas && rendererRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          for (const count of [100, 500, 1000]) {
            const nodes = generateTestNodes(count);
            const connections = generateTestConnections(nodes, count);

            // 清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 渲染并测量性能
            const stats = rendererRef.current.renderConnections(ctx, connections, {
              ...viewport,
              width: canvasSize.width,
              height: canvasSize.height,
            });

            results.push({
              test: '连接线渲染',
              connectionCount: count,
              totalTime: stats.renderTime,
              visibleCount: stats.visibleConnections,
              culledCount: stats.culledConnections,
            });

            // 等待一帧，避免阻塞UI
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // 测试2: 虚拟滚动性能（使用当前的虚拟滚动结果）
      results.push({
        test: '虚拟滚动',
        nodeCount: totalNodes,
        totalTime: performanceMetrics.totalTime,
        quadTreeBuildTime: performanceMetrics.quadTreeBuildTime,
        queryTime: performanceMetrics.queryTime,
        visibleCount: visibleCount,
        culledCount: culledCount,
        cacheHitRate: cacheHitRate,
      });

      console.log('[PerformanceTest] 测试完成，结果数量:', results.length);
      setTestResults(results);
    } catch (error) {
      console.error('[PerformanceTest] 测试失败:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // 渲染连接线
  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;

    if (!canvas || !renderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染连接线
    renderer.renderConnections(ctx, testConnections, {
      ...viewport,
      width: canvasSize.width,
      height: canvasSize.height,
    });
  }, [testConnections, viewport, canvasSize]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">性能验证测试</h1>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">测试控制</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                节点数量: {nodeCount}
              </label>
              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                value={nodeCount}
                onChange={(e) => setNodeCount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                连接线数量: {connectionCount}
              </label>
              <input
                type="range"
                min="10"
                max="2000"
                step="10"
                value={connectionCount}
                onChange={(e) => setConnectionCount(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={runPerformanceTest}
            disabled={isRunning}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400"
          >
            {isRunning ? '测试中...' : '运行性能测试'}
          </button>
        </div>

        {/* 实时性能指标 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">实时性能指标</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">总节点数</div>
              <div className="text-2xl font-bold text-blue-600">{totalNodes}</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">可见节点数</div>
              <div className="text-2xl font-bold text-green-600">{visibleCount}</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">剔除节点数</div>
              <div className="text-2xl font-bold text-orange-600">{culledCount}</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">四叉树构建时间</div>
              <div className="text-2xl font-bold text-purple-600">
                {performanceMetrics.quadTreeBuildTime.toFixed(2)}ms
              </div>
            </div>

            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">查询时间</div>
              <div className="text-2xl font-bold text-pink-600">
                {performanceMetrics.queryTime.toFixed(2)}ms
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">总时间</div>
              <div className="text-2xl font-bold text-indigo-600">
                {performanceMetrics.totalTime.toFixed(2)}ms
              </div>
            </div>
          </div>
        </div>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">测试结果</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      测试类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      可见数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      剔除数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      性能评级
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testResults.map((result, index) => {
                    const isGood = result.totalTime < 50;
                    const isOk = result.totalTime < 100;

                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.test}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.nodeCount || result.connectionCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.totalTime.toFixed(2)}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.visibleCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.culledCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isGood ? 'bg-green-100 text-green-800' :
                            isOk ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {isGood ? '优秀' : isOk ? '良好' : '需优化'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Canvas渲染区域 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">连接线渲染预览</h2>

          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="w-full h-auto"
            />
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>提示：使用滑块调整节点和连接线数量，观察性能变化</p>
            <p>性能目标：100条连接线 &lt;5ms，1000条连接线 &lt;50ms</p>
          </div>
        </div>
      </div>
    </div>
  );
};

