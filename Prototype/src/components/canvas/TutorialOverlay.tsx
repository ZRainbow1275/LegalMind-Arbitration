/**
 * 用户引导覆盖层
 * 
 * 提供新手引导和功能提示
 */

import React, { useState, useEffect } from 'react';

// ==================== 类型定义 ====================

import { TutorialConfig } from '../../config/tutorials';

interface TutorialOverlayProps {
  tutorial: TutorialConfig;
  onComplete: () => void;
  onSkip: () => void;
}

// ==================== 组件 ====================

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  tutorial,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = tutorial.steps[currentStep];
  const isLastStep = currentStep === tutorial.steps.length - 1;

  // 更新目标元素位置
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // 处理下一步
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 处理上一步
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // 计算提示框位置
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    const style: React.CSSProperties = {
      position: 'fixed',
    };

    switch (step.position) {
      case 'top':
        style.left = targetRect.left + targetRect.width / 2;
        style.bottom = window.innerHeight - targetRect.top + padding;
        style.transform = 'translateX(-50%)';
        break;

      case 'right':
        style.left = targetRect.right + padding;
        style.top = targetRect.top + targetRect.height / 2;
        style.transform = 'translateY(-50%)';
        break;

      case 'bottom':
        style.left = targetRect.left + targetRect.width / 2;
        style.top = targetRect.bottom + padding;
        style.transform = 'translateX(-50%)';
        break;

      case 'left':
        style.right = window.innerWidth - targetRect.left + padding;
        style.top = targetRect.top + targetRect.height / 2;
        style.transform = 'translateY(-50%)';
        break;
    }

    return style;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
      }}
    >
      {/* 遮罩层 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        onClick={onSkip}
      />

      {/* 高亮目标元素 */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            border: '4px solid #f97316',
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 提示框 */}
      <div
        style={{
          ...getTooltipStyle(),
          maxWidth: 400,
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          padding: 24,
          zIndex: 10001,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 进度指示器 */}
        {tutorial.showProgress && (
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginBottom: 16,
            }}
          >
            {tutorial.steps.map((_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: index <= currentStep ? '#f97316' : '#e5e7eb',
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
        )}

        {/* 标题 */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 12,
          }}
        >
          {step.title}
        </div>

        {/* 内容 */}
        <div
          style={{
            fontSize: 14,
            color: '#6b7280',
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {step.content}
        </div>

        {/* 操作按钮 */}
        {step.action && (
          <button
            onClick={step.action.onClick}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#f97316',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            {step.action.label}
          </button>
        )}

        {/* 导航按钮 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onSkip}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            跳过
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                上一步
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f97316',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {isLastStep ? '完成' : '下一步'}
            </button>
          </div>
        </div>

        {/* 步骤计数 */}
        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontSize: 12,
            color: '#9ca3af',
          }}
        >
          {currentStep + 1} / {tutorial.steps.length}
        </div>
      </div>
    </div>
  );
};

// ==================== 预定义教程 ====================



