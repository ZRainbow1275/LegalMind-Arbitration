// dev/src/components/performance/lazy-loader.tsx
'use client';

import { useState, useEffect, useRef, ReactNode, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Eye, Clock } from 'lucide-react';

interface LazyLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  className?: string;
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
}

type LazyComponentModule = { default: React.ComponentType<Record<string, unknown>> };

interface LazyComponentProps {
  component: () => Promise<LazyComponentModule>;
  props?: Record<string, unknown>;
  fallback?: ReactNode;
}

// 通用懒加载容器
export function LazyLoader({ 
  children, 
  fallback, 
  threshold = 0.1, 
  rootMargin = '50px',
  delay = 0,
  className 
}: LazyLoaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
          } else {
            setIsVisible(true);
          }
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, delay]);

  useEffect(() => {
    if (isVisible) {
      // 模拟加载时间
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const defaultFallback = (
    <div className="animate-pulse">
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? (
        isLoaded ? (
          children
        ) : (
          fallback || defaultFallback
        )
      ) : (
        fallback || defaultFallback
      )}
    </div>
  );
}

// 懒加载图片组件
export function LazyImage({ 
  src, 
  alt, 
  className, 
  width, 
  height, 
  placeholder 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {!isVisible && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <Eye className="h-6 w-6 text-gray-400" />
        </div>
      )}
      
      {isVisible && !isError && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            width={width}
            height={height}
          />
        </>
      )}
      
      {isError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-sm">图片加载失败</div>
            {placeholder && <div className="text-xs mt-1">{placeholder}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// 懒加载组件
export function LazyComponent({ component, props = {}, fallback }: LazyComponentProps) {
  const [Component, setComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComponent = async () => {
    if (Component) return;
    
    setIsLoading(true);
    setError(null);
    
  try {
      const loadedModule = await component();
      setComponent(() => loadedModule.default);
    } catch (err) {
      setError('组件加载失败');
      console.error('懒加载组件失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultFallback = (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-red-600">
            <div className="mb-2">{error}</div>
            <button 
              onClick={loadComponent}
              className="text-sm text-blue-600 hover:underline"
            >
              重试
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return fallback || defaultFallback;
  }

  if (!Component) {
    return (
      <LazyLoader>
        <div onClick={loadComponent}>
          {fallback || defaultFallback}
        </div>
      </LazyLoader>
    );
  }

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <Component {...props} />
    </Suspense>
  );
}

// 懒加载列表项
export function LazyListItem({ 
  children, 
  index, 
  batchSize = 10 
}: { 
  children: ReactNode; 
  index: number; 
  batchSize?: number;
}) {
  const shouldDelay = index >= batchSize;
  const delay = shouldDelay ? Math.floor(index / batchSize) * 100 : 0;

  return (
    <LazyLoader delay={delay} threshold={0.1}>
      {children}
    </LazyLoader>
  );
}

// 虚拟滚动组件
interface VirtualScrollProps<TItem> {
  items: TItem[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: TItem, index: number) => ReactNode;
  overscan?: number;
}

export function VirtualScroll<TItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5
}: VirtualScrollProps<TItem>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={scrollElementRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 预加载组件
export function Preloader({ urls }: { urls: string[] }) {
  useEffect(() => {
    const preloadImages = urls.filter(url => url.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    const preloadScripts = urls.filter(url => url.match(/\.js$/i));
    const preloadStyles = urls.filter(url => url.match(/\.css$/i));

    // 预加载图片
    preloadImages.forEach(url => {
      const img = new Image();
      img.src = url;
    });

    // 预加载脚本
    preloadScripts.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = url;
      document.head.appendChild(link);
    });

    // 预加载样式
    preloadStyles.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = url;
      document.head.appendChild(link);
    });
  }, [urls]);

  return null;
}

// 性能监控Hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime
      }));
    };
  }, []);

  const trackComponent = () => {
    setMetrics(prev => ({
      ...prev,
      componentCount: prev.componentCount + 1
    }));
  };

  const getMemoryUsage = () => {
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
    if (!perf.memory) return null;

    const memory = perf.memory;
    return {
      used: memory.usedJSHeapSize / 1024 / 1024,
      total: memory.totalJSHeapSize / 1024 / 1024,
      limit: memory.jsHeapSizeLimit / 1024 / 1024
    };
  };

  return {
    metrics,
    trackComponent,
    getMemoryUsage
  };
}
