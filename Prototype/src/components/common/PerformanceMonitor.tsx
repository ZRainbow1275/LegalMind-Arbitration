/**
 * 性能监控面板组件
 * 
 * 显示实时性能指标：FPS、内存使用、渲染时间、内存泄漏警告
 * 基于2025年最佳实践实现
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Activity, Cpu, HardDrive, AlertTriangle } from 'lucide-react';
import { FloatingPanel } from './FloatingPanel';
import {
  getMemoryUsage,
  formatMemorySize,
  memoryLeakDetector,
  type MemoryUsage,
  type MemoryLeakWarning,
} from '../../lib/memory-leak-detector';

/**
 * 性能监控面板Props
 */
interface PerformanceMonitorProps {
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * FPS计数器Hook
 */
function useFPSCounter(): number {
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  useEffect(() => {
    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= 1000) {
        const currentFPS = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFPS);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    rafIdRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return fps;
}

/**
 * 渲染时间监控Hook
 */
function useRenderTime(): number {
  const [renderTime, setRenderTime] = useState(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const time = performance.now() - startTimeRef.current;
    setRenderTime(time);
    startTimeRef.current = performance.now();
  }, []);

  return renderTime;
}

/**
 * 性能监控面板组件
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onClose,
  position = 'top-right',
}) => {
  const fps = useFPSCounter();
  const renderTime = useRenderTime();
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [warnings, setWarnings] = useState<MemoryLeakWarning[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // 计算默认位置
  const getDefaultPosition = () => {
    const padding = 20;
    const width = 384; // w-96
    const height = 400; // approx

    switch (position) {
      case 'top-right': return { x: window.innerWidth - width - padding, y: padding };
      case 'top-left': return { x: padding, y: padding };
      case 'bottom-right': return { x: window.innerWidth - width - padding, y: window.innerHeight - height - padding };
      case 'bottom-left': return { x: padding, y: window.innerHeight - height - padding };
      default: return { x: window.innerWidth - width - padding, y: padding };
    }
  };

  // 启动内存监控
  useEffect(() => {
    if (!isMonitoring) return;

    memoryLeakDetector.start();

    // 监听警告
    const unsubscribe = memoryLeakDetector.onWarning((warning) => {
      setWarnings(prev => [...prev.slice(-9), warning]); // 保留最近10条
    });

    // 定期更新内存使用
    const interval = setInterval(() => {
      setMemoryUsage(getMemoryUsage());
    }, 1000);

    return () => {
      memoryLeakDetector.stop();
      unsubscribe();
      clearInterval(interval);
    };
  }, [isMonitoring]);

  // FPS颜色
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 内存使用颜色
  const getMemoryColor = (percent: number) => {
    if (percent < 60) return 'text-green-500';
    if (percent < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 渲染时间颜色
  const getRenderTimeColor = (time: number) => {
    if (time < 16) return 'text-green-500';
    if (time < 33) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 警告严重级别颜色
  const getWarningColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <FloatingPanel
      title="性能监控"
      defaultPosition={getDefaultPosition()}
      defaultSize={{ width: 384, height: 500 }}
      minSize={{ width: 300, height: 300 }}
      maxSize={{ width: 500, height: 800 }}
      onClose={onClose}
      storageKey="workspace-performance-panel"
    >
      <div className="space-y-4">
        {/* FPS指标 */}
        <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">FPS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getFPSColor(fps)}`}>
              {fps}
            </span>
            <span className="text-xs text-gray-500">帧/秒</span>
          </div>
        </div>

        {/* 内存使用 */}
        {memoryUsage && (
          <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">内存</span>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-lg font-bold ${getMemoryColor(memoryUsage.usedPercent)}`}>
                {memoryUsage.usedPercent.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">
                {formatMemorySize(memoryUsage.usedJSHeapSize)} / {formatMemorySize(memoryUsage.jsHeapSizeLimit)}
              </span>
            </div>
          </div>
        )}

        {/* 渲染时间 */}
        <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">渲染时间</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${getRenderTimeColor(renderTime)}`}>
              {renderTime.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">ms</span>
          </div>
        </div>

        {/* 内存泄漏警告 */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span>内存泄漏警告 ({warnings.length})</span>
            </div>
            <ScrollArea className="h-32 rounded-lg border border-gray-200 bg-white/50">
              <div className="p-2 space-y-2">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="text-xs p-2 rounded bg-gray-50 border-l-2"
                    style={{
                      borderLeftColor: warning.severity === 'high' ? '#ef4444' : warning.severity === 'medium' ? '#f59e0b' : '#3b82f6'
                    }}
                  >
                    <div className={`font-medium ${getWarningColor(warning.severity)}`}>
                      {warning.type.toUpperCase()}
                    </div>
                    <div className="text-gray-600 mt-1">{warning.message}</div>
                    <div className="text-gray-400 mt-1">
                      {new Date(warning.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMonitoring(!isMonitoring)}
            className="flex-1"
          >
            {isMonitoring ? '暂停监控' : '开始监控'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWarnings([])}
            className="flex-1"
          >
            清除警告
          </Button>
        </div>

        {/* 性能提示 */}
        <div className="text-xs text-gray-500 space-y-1 p-2 bg-blue-50/50 rounded border border-blue-100">
          <div className="font-medium text-blue-700">性能建议：</div>
          <div>• FPS &gt; 55：流畅</div>
          <div>• 内存 &lt; 80%：正常</div>
          <div>• 渲染 &lt; 16ms：一帧内完成</div>
        </div>
      </div>
    </FloatingPanel>
  );
};

