// dev/src/components/performance/performance-monitor.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Zap,
  Clock,
  Database,
  Wifi,
  Monitor,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage: number;
  networkLatency: number;
  bundleSize: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export function PerformanceMonitor({ isVisible = false, onClose }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      collectPerformanceMetrics();
    }
  }, [isVisible]);

  const collectPerformanceMetrics = async () => {
    setIsCollecting(true);

    try {
      // 收集Web Vitals指标
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
        // 模拟收集各种性能指标
        const performanceData: PerformanceMetrics = {
          pageLoadTime: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
          firstContentfulPaint: await getFirstContentfulPaint(),
          largestContentfulPaint: await getLargestContentfulPaint(),      
          cumulativeLayoutShift: await getCumulativeLayoutShift(),        
          firstInputDelay: await getFirstInputDelay(),
        memoryUsage: getMemoryUsage(),
        networkLatency: await getNetworkLatency(),
        bundleSize: await getBundleSize()
      };

      setMetrics(performanceData);
    } catch (error) {
      console.error('性能指标收集失败:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  const getFirstContentfulPaint = async (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        observer.disconnect(); // 清理observer
        resolve(fcpEntry ? fcpEntry.startTime : 0);
      });

      observer.observe({ entryTypes: ['paint'] });

      // 超时处理
      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 1000);
    });
  };

  const getLargestContentfulPaint = async (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcpEntry = entries[entries.length - 1];
        observer.disconnect(); // 清理observer
        resolve(lcpEntry ? lcpEntry.startTime : 0);
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 2000);
    });
  };

  const getCumulativeLayoutShift = async (): Promise<number> => {
    return new Promise((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        type LayoutShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean };
        const isLayoutShiftEntry = (entry: PerformanceEntry): entry is LayoutShiftEntry => {
          return 'value' in entry && 'hadRecentInput' in entry;
        };

        for (const entry of list.getEntries()) {
          if (!isLayoutShiftEntry(entry)) continue;
          if (entry.hadRecentInput) continue;
          clsValue += entry.value;
        }
        observer.disconnect(); // 清理observer
        resolve(clsValue);
      });

      observer.observe({ entryTypes: ['layout-shift'] });

      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 2000);
    });
  };

  const getFirstInputDelay = async (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fidEntry = entries[0];
        observer.disconnect(); // 清理observer
        type FirstInputEntry = PerformanceEntry & { processingStart: number };
        const isFirstInputEntry = (entry: PerformanceEntry): entry is FirstInputEntry => {
          return 'processingStart' in entry;
        };
        if (!fidEntry) return resolve(0);
        if (!isFirstInputEntry(fidEntry)) return resolve(0);
        resolve(fidEntry.processingStart - fidEntry.startTime);
      });

      observer.observe({ entryTypes: ['first-input'] });

      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 3000);
    });
  };

  const getMemoryUsage = (): number => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (!perf.memory) return 0;
    return perf.memory.usedJSHeapSize / 1024 / 1024; // MB
  };

  const getNetworkLatency = async (): Promise<number> => {
    const startTime = Date.now();
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      return Date.now() - startTime;
    } catch {
      return 0;
    }
  };

  const getBundleSize = async (): Promise<number> => {
    // 模拟获取打包大小
    return Math.random() * 500 + 200; // KB
  };

  const getScoreColor = (score: number, thresholds: { good: number; poor: number }) => {
    if (score <= thresholds.good) return 'text-green-600';
    if (score <= thresholds.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number, thresholds: { good: number; poor: number }) => {
    if (score <= thresholds.good) return CheckCircle;
    if (score <= thresholds.poor) return AlertTriangle;
    return AlertTriangle;
  };

  const getOverallScore = (): number => {
    if (!metrics) return 0;
    
    let score = 100;
    
    // FCP评分 (0-2.5s为好，2.5-4s为中等，>4s为差)
    if (metrics.firstContentfulPaint > 4000) score -= 20;
    else if (metrics.firstContentfulPaint > 2500) score -= 10;
    
    // LCP评分 (0-2.5s为好，2.5-4s为中等，>4s为差)
    if (metrics.largestContentfulPaint > 4000) score -= 25;
    else if (metrics.largestContentfulPaint > 2500) score -= 15;
    
    // CLS评分 (0-0.1为好，0.1-0.25为中等，>0.25为差)
    if (metrics.cumulativeLayoutShift > 0.25) score -= 20;
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 10;
    
    // FID评分 (0-100ms为好，100-300ms为中等，>300ms为差)
    if (metrics.firstInputDelay > 300) score -= 15;
    else if (metrics.firstInputDelay > 100) score -= 8;
    
    return Math.max(0, score);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                性能监控
              </CardTitle>
              <CardDescription>
                实时监控系统性能指标和Web Vitals
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {metrics && (
                <Badge className={`${getOverallScore() >= 80 ? 'bg-green-100 text-green-800' : 
                                   getOverallScore() >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                   'bg-red-100 text-red-800'}`}>
                  总分: {getOverallScore()}
                </Badge>
              )}
              <Button variant="outline" onClick={collectPerformanceMetrics} disabled={isCollecting}>
                {isCollecting ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    收集中...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    刷新数据
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="max-h-[70vh] overflow-y-auto">
          {isCollecting && (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-green-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">正在收集性能数据...</p>
            </div>
          )}

          {metrics && !isCollecting && (
            <div className="space-y-6">
              {/* Web Vitals 核心指标 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Web Vitals 核心指标
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(metrics.firstContentfulPaint, { good: 2500, poor: 4000 })}`}>
                          {(metrics.firstContentfulPaint / 1000).toFixed(2)}s
                        </div>
                        <div className="text-sm text-gray-600">FCP</div>
                        <div className="text-xs text-gray-500 mt-1">首次内容绘制</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(metrics.largestContentfulPaint, { good: 2500, poor: 4000 })}`}>
                          {(metrics.largestContentfulPaint / 1000).toFixed(2)}s
                        </div>
                        <div className="text-sm text-gray-600">LCP</div>
                        <div className="text-xs text-gray-500 mt-1">最大内容绘制</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(metrics.cumulativeLayoutShift, { good: 0.1, poor: 0.25 })}`}>
                          {metrics.cumulativeLayoutShift.toFixed(3)}
                        </div>
                        <div className="text-sm text-gray-600">CLS</div>
                        <div className="text-xs text-gray-500 mt-1">累积布局偏移</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(metrics.firstInputDelay, { good: 100, poor: 300 })}`}>
                          {metrics.firstInputDelay.toFixed(0)}ms
                        </div>
                        <div className="text-sm text-gray-600">FID</div>
                        <div className="text-xs text-gray-500 mt-1">首次输入延迟</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 系统资源指标 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-500" />
                  系统资源指标
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {metrics.memoryUsage.toFixed(1)}MB
                        </div>
                        <div className="text-sm text-gray-600">内存使用</div>
                        <Progress value={Math.min((metrics.memoryUsage / 100) * 100, 100)} className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {metrics.networkLatency}ms
                        </div>
                        <div className="text-sm text-gray-600">网络延迟</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {metrics.networkLatency < 100 ? '优秀' : 
                           metrics.networkLatency < 300 ? '良好' : '较慢'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {metrics.bundleSize.toFixed(0)}KB
                        </div>
                        <div className="text-sm text-gray-600">包大小</div>
                        <div className="text-xs text-gray-500 mt-1">JavaScript</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {(metrics.pageLoadTime / 1000).toFixed(2)}s
                        </div>
                        <div className="text-sm text-gray-600">页面加载</div>
                        <div className="text-xs text-gray-500 mt-1">总时间</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 性能建议 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  性能优化建议
                </h3>
                <div className="space-y-3">
                  {metrics.firstContentfulPaint > 2500 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-900">首次内容绘制较慢</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        建议：优化关键渲染路径，减少阻塞资源，使用代码分割
                      </p>
                    </div>
                  )}

                  {metrics.largestContentfulPaint > 2500 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-900">最大内容绘制较慢</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        建议：优化图片加载，使用懒加载，减少主线程工作
                      </p>
                    </div>
                  )}

                  {metrics.cumulativeLayoutShift > 0.1 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-900">布局偏移较大</span>
                      </div>
                      <p className="text-sm text-orange-700 mt-1">
                        建议：为图片和广告设置尺寸，避免动态插入内容
                      </p>
                    </div>
                  )}

                  {getOverallScore() >= 80 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-900">性能表现优秀</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        当前页面性能指标良好，继续保持优化策略
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
