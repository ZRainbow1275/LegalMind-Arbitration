// dev/src/lib/dynamic-imports.tsx
import dynamic, { type DynamicOptionsLoadingProps } from 'next/dynamic';
import type { ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';

// 通用加载组件
const DefaultLoadingComponent = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    </CardContent>
  </Card>
);

// 骨架屏加载组件
const SkeletonLoadingComponent = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-32 w-full" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

// 表格骨架屏
const TableSkeletonComponent = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="grid grid-cols-4 gap-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    ))}
  </div>
);

// 图表骨架屏
const ChartSkeletonComponent = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-64 w-full" />
    <div className="flex justify-center space-x-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

  // 动态导入配置
  type DynamicLoadingComponent = (loadingProps: DynamicOptionsLoadingProps) => ReactNode;

  type GlobalSearchProps = {
    isOpen: boolean;
    onClose: () => void;
  };

  type AdvancedFilterCriteria = {
    keyword: string;
    caseType: string[];
    status: string[];
    dateRange: { start: string; end: string };
    amountRange: { min: number; max: number };
    arbitrator: string;
    priority: string[];
    tags: string[];
  };

  type AdvancedFilterProps = {
    isOpen: boolean;
    onClose: () => void;
    onApplyFilter: (criteria: AdvancedFilterCriteria) => void;
    initialCriteria?: Partial<AdvancedFilterCriteria>;
  };

  type IdentityVerificationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onVerificationComplete?: (success: boolean) => void;
  };

  type DeviceSettingsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSettingsApplied?: () => void;
  };

  type PerformanceMonitorProps = {
    isVisible?: boolean;
    onClose?: () => void;
  };

  interface DynamicImportOptions {
    loading?: DynamicLoadingComponent;
    ssr?: boolean;
  }

// 创建动态组件的工厂函数
export function createDynamicComponent<TProps extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<TProps> }>,
  options: DynamicImportOptions = {}
  ) {
    return dynamic(importFn, {
      loading: options.loading || DefaultLoadingComponent,
      ssr: options.ssr ?? true,
    });
  }

// 预定义的动态组件

// AI助手页面 - 大型组件，适合懒加载
export const DynamicAIAssistant = createDynamicComponent(
  () => import('@/app/(private)/ai-assistant/page'),
  {
    loading: SkeletonLoadingComponent,
    ssr: false // AI助手不需要SSR
  }
);

// 数据报告页面 - 包含图表，适合懒加载
export const DynamicReportsPage = createDynamicComponent(
  () => import('@/app/(private)/reports/page'),
  {
    loading: ChartSkeletonComponent,
    ssr: false // 图表组件通常不需要SSR
  }
);

// 文档管理页面 - 包含大量列表
export const DynamicDocumentsPage = createDynamicComponent(
  () => import('@/app/(private)/documents/page'),
  {
    loading: TableSkeletonComponent
  }
);

// 仲裁员库页面
export const DynamicArbitratorsPage = createDynamicComponent(
  () => import('@/app/(private)/arbitrators/page'),
  {
    loading: SkeletonLoadingComponent
  }
);

// 调解管理页面
export const DynamicMediationPage = createDynamicComponent(
  () => import('@/app/(private)/mediation/page'),
  {
    loading: TableSkeletonComponent
  }
);

// 日程管理页面
export const DynamicSchedulePage = createDynamicComponent(
  () => import('@/app/(private)/schedule/page'),
  {
    loading: SkeletonLoadingComponent
  }
);

// 在线庭审页面 - 重要功能，保持SSR
export const DynamicOnlineHearingPage = createDynamicComponent(
  () => import('@/app/(private)/hearing/online/page'),
  {
    loading: DefaultLoadingComponent,
    ssr: true
  }
);

  // 模态框组件 - 按需加载
  export const DynamicGlobalSearch = createDynamicComponent<GlobalSearchProps>(
    () =>
      import('@/components/search/global-search').then((mod) => ({
        default: mod.GlobalSearch as ComponentType<GlobalSearchProps>,
      })),
    {
      loading: () => null, // 搜索框不需要加载状态
      ssr: false,
    }
  );

  export const DynamicAdvancedFilter = createDynamicComponent<AdvancedFilterProps>(
    () =>
      import('@/components/search/advanced-filter').then((mod) => ({
        default: mod.AdvancedFilter as ComponentType<AdvancedFilterProps>,
      })),
    {
      loading: () => null,
      ssr: false,
    }
  );

export const DynamicPerformanceMonitor = createDynamicComponent<PerformanceMonitorProps>(
  () =>
    import('@/components/performance/performance-monitor').then((mod) => ({
      default: mod.PerformanceMonitor as ComponentType<PerformanceMonitorProps>,
    })),
  {
    loading: () => null,
    ssr: false,
  }
);

  // 身份验证模态框
  export const DynamicIdentityVerificationModal = createDynamicComponent<IdentityVerificationModalProps>(
    () =>
      import('@/components/hearing/identity-verification-modal').then((mod) => ({
        default: mod.IdentityVerificationModal as ComponentType<IdentityVerificationModalProps>,
      })),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  );

  // 设备设置模态框
  export const DynamicDeviceSettingsModal = createDynamicComponent<DeviceSettingsModalProps>(
    () =>
      import('@/components/hearing/device-settings-modal').then((mod) => ({
        default: mod.DeviceSettingsModal as ComponentType<DeviceSettingsModalProps>,
      })),
    {
      loading: DefaultLoadingComponent,
      ssr: false,
    }
  );

// 路由级别的代码分割
export const routeComponents = {
  // 主要页面
  dashboard: () => import('@/app/(private)/dashboard/page'),
  cases: () => import('@/app/(private)/cases/page'),
  documents: () => import('@/app/(private)/documents/page'),
  arbitrators: () => import('@/app/(private)/arbitrators/page'),
  mediation: () => import('@/app/(private)/mediation/page'),
  schedule: () => import('@/app/(private)/schedule/page'),
  
  // 高级功能页面
  aiAssistant: () => import('@/app/(private)/ai-assistant/page'),
  reports: () => import('@/app/(private)/reports/page'),
  
  // 庭审相关
  hearingOnline: () => import('@/app/(private)/hearing/online/page'),
    hearingWaiting: () => import('@/app/(private)/hearings/[id]/waiting/page'),
  
  // 设置页面
  settings: () => import('@/app/(private)/settings/page'),
};

// 预加载函数
export function preloadRoute(routeName: keyof typeof routeComponents) {
  if (typeof window !== 'undefined') {
    routeComponents[routeName]().catch((error) => {
      clientLogger.error('[DynamicImports] 预加载路由组件失败', { routeName, error });
    });
  }
}

// 批量预加载
export function preloadRoutes(routeNames: (keyof typeof routeComponents)[]) {
  if (typeof window !== 'undefined') {
    routeNames.forEach(routeName => {
      setTimeout(() => preloadRoute(routeName), Math.random() * 1000);
    });
  }
}

// 智能预加载 - 根据用户行为预测
export function smartPreload() {
  if (typeof window === 'undefined') return;

  // 预加载核心页面
  const coreRoutes: (keyof typeof routeComponents)[] = ['dashboard', 'cases', 'documents'];
  preloadRoutes(coreRoutes);

  // 根据当前路径预测下一个可能访问的页面
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('/dashboard')) {
    // 在仪表板页面，用户可能会访问案件或文档
    setTimeout(() => preloadRoutes(['cases', 'documents']), 2000);
  } else if (currentPath.includes('/cases')) {
    // 在案件页面，用户可能会访问文档或日程
    setTimeout(() => preloadRoutes(['documents', 'schedule']), 2000);
  } else if (currentPath.includes('/documents')) {
    // 在文档页面，用户可能会访问AI助手
    setTimeout(() => preloadRoute('aiAssistant'), 2000);
  }
}

// 组件级别的懒加载工具
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  loadingComponent?: DynamicLoadingComponent
) {
  return createDynamicComponent(
    () => Promise.resolve({ default: Component }),
    {
      loading: loadingComponent || DefaultLoadingComponent,
      ssr: false
    }
  );
}

// 条件加载 - 根据条件决定是否加载组件
export function conditionalLoad<T extends object>(
  condition: boolean,
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ComponentType<T>
) {
  if (!condition && fallback) {
    return fallback;
  }
  
  return createDynamicComponent(importFn, {
    ssr: false
  });
}

// 性能监控 - 跟踪动态导入的性能
export function trackDynamicImport(componentName: string) {
  if (typeof window === 'undefined') return;
  
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      clientLogger.info(`动态组件 ${componentName} 加载时间: ${loadTime.toFixed(2)}ms`);
      
      // 可以发送到分析服务
      if (loadTime > 1000) {
        clientLogger.warn(`组件 ${componentName} 加载时间过长: ${loadTime.toFixed(2)}ms`);
      }
    }
  };
}
