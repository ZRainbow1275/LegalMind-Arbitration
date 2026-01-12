/**
 * Tutorial Tooltip Component - 新手引导提示框组件
 * 
 * 功能:
 * - 显示引导步骤的标题和内容
 * - 显示进度指示器
 * - 提供导航按钮（上一步、下一步、跳过、完成）
 * - 自动定位到目标元素
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { TutorialStep } from '../config/tutorialSteps';

interface TutorialTooltipProps {
  /** 当前步骤 */
  step: TutorialStep;
  /** 当前步骤索引 */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 上一步回调 */
  onPrev?: () => void;
  /** 下一步回调 */
  onNext?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
  /** 完成回调 */
  onComplete?: () => void;
}

/**
 * 计算提示框位置
 */
const calculatePosition = (
  target: string | undefined,
  placement: string = 'center'
): React.CSSProperties => {
  if (!target || placement === 'center') {
    // 居中显示
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10001,
    };
  }

  // 查找目标元素
  const element = document.querySelector(target);
  if (!element) {
    // 目标元素不存在，居中显示
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10001,
    };
  }

  const rect = element.getBoundingClientRect();
  const tooltipWidth = 400;
  const tooltipHeight = 200;
  const gap = 16;

  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
  };

  switch (placement) {
    case 'top':
      style.left = `${rect.left + rect.width / 2}px`;
      style.top = `${rect.top - tooltipHeight - gap}px`;
      style.transform = 'translateX(-50%)';
      break;
    case 'bottom':
      style.left = `${rect.left + rect.width / 2}px`;
      style.top = `${rect.bottom + gap}px`;
      style.transform = 'translateX(-50%)';
      break;
    case 'left':
      style.left = `${rect.left - tooltipWidth - gap}px`;
      style.top = `${rect.top + rect.height / 2}px`;
      style.transform = 'translateY(-50%)';
      break;
    case 'right':
      style.left = `${rect.right + gap}px`;
      style.top = `${rect.top + rect.height / 2}px`;
      style.transform = 'translateY(-50%)';
      break;
    default:
      style.left = '50%';
      style.top = '50%';
      style.transform = 'translate(-50%, -50%)';
  }

  return style;
};

/**
 * 新手引导提示框组件
 */
export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  step,
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onSkip,
  onComplete,
}) => {
  const [position, setPosition] = useState<React.CSSProperties>({});

  // 计算位置
  useEffect(() => {
    const updatePosition = () => {
      const newPosition = calculatePosition(step.target, step.placement);
      setPosition(newPosition);
    };

    updatePosition();

    // 监听窗口大小变化
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [step.target, step.placement]);

  return (
    <div
      className="tutorial-tooltip bg-white rounded-lg shadow-2xl border-2 border-orange-500 p-6 max-w-md"
      style={position}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-orange-600 mb-1">{step.title}</h3>
          <div className="text-sm text-gray-500">
            步骤 {currentStep + 1} / {totalSteps}
          </div>
        </div>
        {step.showSkip && (
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="跳过引导"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* 内容 */}
      <div className="mb-6">
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{step.content}</p>
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-between gap-3">
        {/* 上一步按钮 */}
        {step.showPrev ? (
          <button
            onClick={onPrev}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>
        ) : (
          <div />
        )}

        {/* 右侧按钮组 */}
        <div className="flex items-center gap-3">
          {/* 跳过按钮 */}
          {step.showSkip && (
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              跳过
            </button>
          )}

          {/* 下一步按钮 */}
          {step.showNext && (
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
            >
              下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* 完成按钮 */}
          {step.showComplete && (
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
            >
              开始使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

