// dev/src/lib/hooks/use-synced-tab.ts
// 统一在 URL 中同步 ?tab 参数的 Hook，减少重复逻辑

'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export function useSyncedTab(allowedTabs: string[], defaultTab: string){
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 初始化时从URL读取tab参数
  const initialTab = (() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && allowedTabs.includes(urlTab)) {
      return urlTab;
    }
    return defaultTab;
  })();

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // 外部→内部：URL 变化驱动本地状态（只监听searchParams变化）
  useEffect(()=>{
    const t = searchParams.get('tab');
    const targetTab = (t && allowedTabs.includes(t)) ? t : defaultTab;

    // 只有当URL中的tab与当前activeTab不同时才更新状态
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
  },[searchParams, defaultTab, allowedTabs, activeTab]);

  // 创建一个包装的setActiveTab函数，直接更新URL和状态
  const setActiveTabWithURL = (newTab: string) => {
    if (newTab === activeTab) return; // 避免重复设置

    setActiveTab(newTab);

    // 同步更新URL
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === defaultTab) {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }

    // 使用setTimeout避免在渲染过程中更新URL
    setTimeout(() => {
      router.replace(`${pathname}${params.toString()?`?${params}`:''}`);
    }, 0);
  };

  return { activeTab, setActiveTab: setActiveTabWithURL } as const;
}

