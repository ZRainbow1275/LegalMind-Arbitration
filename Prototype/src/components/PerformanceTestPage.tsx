/**
 * 性能测试页面
 * 
 * 用于验证四叉树虚拟化修复效果
 */

import React, { useState, useEffect } from 'react';
import { UniversalCanvas } from './canvas/UniversalCanvas';
import { useCanvasStore } from '../lib/canvas-store';
import { ElementFactory } from '../lib/element-factory';
import { Button } from './ui/button';

export const PerformanceTestPage: React.FC = () => {
  const { canvas, initCanvas, addElement, updateViewport } = useCanvasStore();
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [renderCount, setRenderCount] = useState(0);

  // 初始化画布
  useEffect(() => {
    if (!canvas) {
      initCanvas('性能测试画布');
    }
  }, [canvas, initCanvas]);

  // 监控渲染次数
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    console.log(`[性能测试] 组件渲染次数: ${renderCount + 1}`);
  }, [renderCount]);

  // 测试1：添加大量元素
  const testAddElements = async (count: number) => {
    setTestRunning(true);
    setTestResults([]);

    const startTime = performance.now();
    const results: string[] = [];

    results.push(`开始添加 ${count} 个元素...`);

    for (let i = 0; i < count; i++) {
      const x = Math.random() * 2000;
      const y = Math.random() * 2000;

      const element = ElementFactory.createShape(
        { x, y },
        'rectangle',
        {
          size: { width: 100, height: 100 },
          fillColor: '#f97316'
        }
      );

      addElement(element);

      if ((i + 1) % 100 === 0) {
        results.push(`已添加 ${i + 1} 个元素`);
        setTestResults([...results]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    results.push(`✅ 完成！总耗时: ${duration.toFixed(2)}ms`);
    results.push(`平均每个元素: ${(duration / count).toFixed(2)}ms`);

    setTestResults(results);
    setTestRunning(false);
  };

  // 测试2：视口变化（测试QuadTree是否被重建）
  const testViewportChanges = async () => {
    setTestRunning(true);
    setTestResults([]);

    const results: string[] = [];
    results.push('开始测试视口变化...');
    results.push('⚠️ 请查看控制台，确认QuadTree不会被重建');

    setTestResults([...results]);

    // 执行10次视口变化
    for (let i = 0; i < 10; i++) {
      const zoom = 1 + (i * 0.1);
      updateViewport({ zoom });

      results.push(`第 ${i + 1} 次视口变化，缩放: ${zoom.toFixed(1)}`);
      setTestResults([...results]);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    results.push('✅ 完成！');
    results.push('📊 检查控制台日志：');
    results.push('- 应该看到10次"视口查询"日志');
    results.push('- 应该只看到1次"四叉树构建"日志（初始化时）');
    results.push('- 如果看到多次"四叉树构建"，说明修复失败！');

    setTestResults(results);
    setTestRunning(false);
  };

  // 测试3：元素变化（测试QuadTree是否正确重建）
  const testElementChanges = async () => {
    setTestRunning(true);
    setTestResults([]);

    const results: string[] = [];
    results.push('开始测试元素变化...');
    results.push('⚠️ 请查看控制台，确认QuadTree会被重建');

    setTestResults([...results]);

    // 添加5个元素
    for (let i = 0; i < 5; i++) {
      const element = ElementFactory.createShape(
        { x: i * 150, y: 100 },
        'rectangle',
        {
          size: { width: 100, height: 100 },
          fillColor: '#f97316'
        }
      );

      addElement(element);

      results.push(`添加第 ${i + 1} 个元素`);
      setTestResults([...results]);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    results.push('✅ 完成！');
    results.push('📊 检查控制台日志：');
    results.push('- 应该看到5次"四叉树构建"日志（每次添加元素）');
    results.push('- 应该看到5次"元素hash计算"日志');
    results.push('- 如果没有看到，说明修复失败！');

    setTestResults(results);
    setTestRunning(false);
  };

  // 测试4：综合压力测试
  const testStressTest = async () => {
    setTestRunning(true);
    setTestResults([]);

    const results: string[] = [];
    results.push('开始综合压力测试...');

    // 1. 添加1000个元素
    results.push('步骤1: 添加1000个元素');
    setTestResults([...results]);

    const startTime1 = performance.now();
    for (let i = 0; i < 1000; i++) {
      const element = ElementFactory.createShape(
        { x: Math.random() * 5000, y: Math.random() * 5000 },
        'rectangle',
        {
          size: { width: 50, height: 50 },
          fillColor: '#f97316'
        }
      );
      addElement(element);
    }
    const endTime1 = performance.now();
    results.push(`✅ 完成，耗时: ${(endTime1 - startTime1).toFixed(2)}ms`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. 执行100次视口变化
    results.push('步骤2: 执行100次视口变化');
    setTestResults([...results]);

    const startTime2 = performance.now();
    for (let i = 0; i < 100; i++) {
      updateViewport({
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        zoom: 0.5 + Math.random() * 2
      });
    }
    const endTime2 = performance.now();
    results.push(`✅ 完成，耗时: ${(endTime2 - startTime2).toFixed(2)}ms`);
    results.push(`平均每次: ${((endTime2 - startTime2) / 100).toFixed(2)}ms`);

    results.push('');
    results.push('📊 最终检查：');
    results.push('- QuadTree构建次数应该 ≈ 1000次（每次添加元素）');
    results.push('- 视口查询次数应该 ≈ 100次（每次视口变化）');
    results.push('- 如果QuadTree构建次数 > 1100次，说明修复失败！');

    setTestResults(results);
    setTestRunning(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 左侧：测试控制面板 */}
      <div style={{
        width: 400,
        padding: 20,
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        overflowY: 'auto'
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#f97316' }}>
          性能测试
        </h1>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 10 }}>
            组件渲染次数: <strong>{renderCount}</strong>
          </p>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            画布元素数量: <strong>{canvas ? Object.keys(canvas.elements).length : 0}</strong>
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>测试项目</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button
              onClick={() => testAddElements(100)}
              disabled={testRunning}
              className="bg-orange-500 hover:bg-orange-600"
            >
              测试1: 添加100个元素
            </Button>

            <Button
              onClick={() => testAddElements(1000)}
              disabled={testRunning}
              className="bg-orange-500 hover:bg-orange-600"
            >
              测试1: 添加1000个元素
            </Button>

            <Button
              onClick={testViewportChanges}
              disabled={testRunning}
              className="bg-blue-500 hover:bg-blue-600"
            >
              测试2: 视口变化（验证QuadTree不重建）
            </Button>

            <Button
              onClick={testElementChanges}
              disabled={testRunning}
              className="bg-green-500 hover:bg-green-600"
            >
              测试3: 元素变化（验证QuadTree重建）
            </Button>

            <Button
              onClick={testStressTest}
              disabled={testRunning}
              className="bg-red-500 hover:bg-red-600"
            >
              测试4: 综合压力测试
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>测试结果</h2>
          <div style={{
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            padding: 15,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
            maxHeight: 400,
            overflowY: 'auto'
          }}>
            {testResults.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>等待测试...</p>
            ) : (
              testResults.map((result, index) => (
                <p key={index} style={{ marginBottom: 5 }}>
                  {result}
                </p>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: 20, padding: 15, backgroundColor: '#fef3c7', borderRadius: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: '#92400e' }}>
            ⚠️ 重要提示
          </h3>
          <p style={{ fontSize: 12, color: '#92400e' }}>
            请打开浏览器控制台查看详细的性能监控日志。
            关键日志包括：
          </p>
          <ul style={{ fontSize: 12, color: '#92400e', marginTop: 5, paddingLeft: 20 }}>
            <li>[性能监控] 元素hash计算</li>
            <li>[四叉树] 重建完成</li>
            <li>[虚拟化-四叉树] 可见元素</li>
          </ul>
        </div>
      </div>

      {/* 右侧：画布 */}
      <div style={{ flex: 1 }}>
        <UniversalCanvas width={window.innerWidth - 400} height={window.innerHeight} />
      </div>
    </div>
  );
};

