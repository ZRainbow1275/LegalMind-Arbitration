/**
 * Tutorial Component - 新手引导主组件
 * 
 * 功能:
 * - 整合遮罩层和提示框
 * - 管理引导流程
 * - 处理用户交互
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import React, { useEffect } from 'react';
import { useTutorialStore } from '../stores/tutorialStore';
import { getTotalSteps, getStep } from '../config/tutorialSteps';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialTooltip } from './TutorialTooltip';

/**
 * 新手引导主组件
 */
export const Tutorial: React.FC = () => {
  const {
    isActive,
    currentStep,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  } = useTutorialStore();

  const totalSteps = getTotalSteps();
  const step = getStep(currentStep);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + H 重新开始引导（全局快捷键）
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        const { resetTutorial } = useTutorialStore.getState();
        resetTutorial();
        return;
      }

      // 以下快捷键仅在引导激活时有效
      if (!isActive) return;

      // Escape键跳过引导
      if (e.key === 'Escape') {
        skipTutorial();
      }
      // 左箭头键上一步
      else if (e.key === 'ArrowLeft' && step?.showPrev) {
        prevStep();
      }
      // 右箭头键下一步
      else if (e.key === 'ArrowRight' && step?.showNext) {
        nextStep();
      }
      // Enter键下一步或完成
      else if (e.key === 'Enter') {
        if (step?.showComplete) {
          completeTutorial();
        } else if (step?.showNext) {
          nextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep, step, nextStep, prevStep, skipTutorial, completeTutorial]);

  // 处理下一步
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      nextStep();
    }
  };

  // 处理上一步
  const handlePrev = () => {
    if (currentStep > 0) {
      prevStep();
    }
  };

  // 处理跳过
  const handleSkip = () => {
    skipTutorial();
  };

  // 处理完成
  const handleComplete = () => {
    completeTutorial();
  };

  if (!isActive || !step) {
    return null;
  }

  return (
    <>
      {/* 遮罩层 */}
      <TutorialOverlay target={step.target} show={isActive} />

      {/* 提示框 */}
      <TutorialTooltip
        step={step}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrev={handlePrev}
        onNext={handleNext}
        onSkip={handleSkip}
        onComplete={handleComplete}
      />
    </>
  );
};

