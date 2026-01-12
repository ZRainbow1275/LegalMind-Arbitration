/**
 * LegalMind法律工作台 - 节点创建动画组件
 * 
 * 为节点创建添加趣味性动画效果
 * 
 * @author LegalMind Team
 * @date 2025-11-04
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';

/**
 * 节点创建动画Props
 */
interface NodeCreationAnimationProps {
  /** 是否显示动画 */
  show: boolean;
  /** 动画位置 */
  position: { x: number; y: number };
  /** 节点类型 */
  nodeType: string;
  /** 节点标签 */
  nodeLabel: string;
  /** 动画完成回调 */
  onComplete?: () => void;
}

/**
 * 节点创建动画组件
 * 
 * 功能：
 * 1. 粒子爆炸效果
 * 2. 节点图标放大动画
 * 3. 成功提示
 */
export const NodeCreationAnimation: React.FC<NodeCreationAnimationProps> = ({
  show,
  position,
  nodeLabel,
  onComplete,
}) => {
  const [stage, setStage] = useState<'particles' | 'icon' | 'success' | 'done'>('particles');

  useEffect(() => {
    if (!show) {
      setStage('particles');
      return;
    }

    // 动画时间线
    const timeline = [
      { stage: 'particles', duration: 300 },
      { stage: 'icon', duration: 400 },
      { stage: 'success', duration: 500 },
      { stage: 'done', duration: 200 },
    ];

    let currentTime = 0;
    const timers: NodeJS.Timeout[] = [];

    timeline.forEach(({ stage: nextStage, duration }) => {
      currentTime += duration;
      const timer = setTimeout(() => {
        setStage(nextStage as any);
        if (nextStage === 'done') {
          onComplete?.();
        }
      }, currentTime);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 粒子爆炸效果 */}
      {stage === 'particles' && (
        <div className="relative w-0 h-0">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 2 * Math.PI;
            const distance = 60;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            return (
              <div
                key={i}
                className="absolute w-2 h-2 bg-orange-500 rounded-full animate-ping"
                style={{
                  left: 0,
                  top: 0,
                  animation: `particle-${i} 0.3s ease-out forwards`,
                  animationDelay: `${i * 0.02}s`,
                }}
              >
                <style>{`
                  @keyframes particle-${i} {
                    0% {
                      transform: translate(0, 0) scale(1);
                      opacity: 1;
                    }
                    100% {
                      transform: translate(${x}px, ${y}px) scale(0);
                      opacity: 0;
                    }
                  }
                `}</style>
              </div>
            );
          })}
        </div>
      )}

      {/* 节点图标放大动画 */}
      {stage === 'icon' && (
        <div className="relative">
          <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
          <div className="relative bg-white rounded-full p-4 shadow-2xl animate-bounce">
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {stage === 'success' && (
        <div className="bg-white rounded-lg shadow-2xl p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                创建成功！
              </div>
              <div className="text-xs text-gray-500">
                {nodeLabel}已添加到画布
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全局动画样式 */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

/**
 * 节点创建成功提示
 */
export const NodeCreationToast: React.FC<{
  show: boolean;
  nodeLabel: string;
  onClose: () => void;
}> = ({ show, nodeLabel, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[10000] animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl p-4 border-l-4 border-orange-500">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <div className="text-sm font-semibold text-gray-900">
              节点创建成功
            </div>
            <div className="text-xs text-gray-500">
              {nodeLabel}已添加到画布
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

/**
 * 智能提示气泡
 */
export const SmartTooltip: React.FC<{
  show: boolean;
  position: { x: number; y: number };
  title: string;
  description: string;
  icon?: React.ReactNode;
}> = ({ show, position, title, description, icon }) => {
  if (!show) return null;

  return (
    <div
      className="fixed z-[10000] pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -120%)',
      }}
    >
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-3 max-w-xs animate-fade-in">
        <div className="flex items-start gap-2">
          {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
          <div>
            <div className="text-sm font-semibold mb-1">{title}</div>
            <div className="text-xs text-gray-300">{description}</div>
          </div>
        </div>

        {/* 箭头 */}
        <div
          className="absolute left-1/2 bottom-0 w-0 h-0"
          style={{
            transform: 'translate(-50%, 100%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #111827',
          }}
        />
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -120%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -120%) scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

