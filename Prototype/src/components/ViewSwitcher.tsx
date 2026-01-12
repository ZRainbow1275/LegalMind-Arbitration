/**
 * 视图切换器组件
 * 支持网络图、时间轴、列表三种视图模式
 */

import React from 'react';
import { Network, Clock, List } from 'lucide-react';

export type ViewMode = 'network' | 'timeline' | 'list';

interface ViewSwitcherProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  currentView,
  onViewChange,
}) => {
  const views = [
    {
      id: 'network' as ViewMode,
      icon: Network,
      label: '网络图',
      description: '节点关系视图',
    },
    {
      id: 'timeline' as ViewMode,
      icon: Clock,
      label: '时间轴',
      description: '时间顺序视图',
    },
    {
      id: 'list' as ViewMode,
      icon: List,
      label: '列表',
      description: '表格列表视图',
    },
  ];

  return (
    <div className="fixed top-24 right-4 z-40 bg-white/95 backdrop-blur-md rounded-xl
      border-2 border-orange-300 shadow-2xl p-2"
      style={{
        boxShadow: '0 0 30px rgba(255, 107, 53, 0.2), 0 10px 40px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="flex flex-col gap-1">
        {views.map((view) => {
          const Icon = view.icon;
          const isActive = currentView === view.id;
          
          return (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'hover:bg-orange-50 text-gray-700'
                }`}
              title={view.description}
            >
              <Icon className={`w-5 h-5 ${
                isActive ? 'text-white' : 'text-orange-600'
              }`} />
              <div className="text-left">
                <div className={`text-sm font-bold ${
                  isActive ? 'text-white' : 'text-gray-800'
                }`}>
                  {view.label}
                </div>
                <div className={`text-xs ${
                  isActive ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {view.description}
                </div>
              </div>
              
              {/* 激活指示器 */}
              {isActive && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1
                  w-1 h-8 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

