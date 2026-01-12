/**
 * Tutorial Store - 新手引导状态管理
 * 
 * 功能:
 * - 管理引导状态（激活、当前步骤、完成状态）
 * - 持久化引导状态到localStorage
 * - 提供引导控制方法（开始、下一步、上一步、跳过、完成）
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 引导状态接口
 */
export interface TutorialState {
  /** 引导是否激活 */
  isActive: boolean;
  /** 当前步骤索引（0-based） */
  currentStep: number;
  /** 引导是否完成 */
  isCompleted: boolean;
  /** 引导是否被跳过 */
  isSkipped: boolean;
  /** 完成时间 */
  completedAt?: string;
  /** 跳过时间 */
  skippedAt?: string;
}

/**
 * 引导操作接口
 */
export interface TutorialActions {
  /** 开始引导 */
  startTutorial: () => void;
  /** 下一步 */
  nextStep: () => void;
  /** 上一步 */
  prevStep: () => void;
  /** 跳过引导 */
  skipTutorial: () => void;
  /** 完成引导 */
  completeTutorial: () => void;
  /** 重置引导（用于重新查看） */
  resetTutorial: () => void;
  /** 关闭引导 */
  closeTutorial: () => void;
  /** 跳转到指定步骤 */
  goToStep: (step: number) => void;
}

/**
 * 引导Store类型
 */
export type TutorialStore = TutorialState & TutorialActions;

/**
 * 初始状态
 */
const initialState: TutorialState = {
  isActive: false,
  currentStep: 0,
  isCompleted: false,
  isSkipped: false,
  completedAt: undefined,
  skippedAt: undefined,
};

/**
 * 创建引导Store
 */
export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * 开始引导
       */
      startTutorial: () => {
        set({
          isActive: true,
          currentStep: 0,
          isCompleted: false,
          isSkipped: false,
          completedAt: undefined,
          skippedAt: undefined,
        });
      },

      /**
       * 下一步
       */
      nextStep: () => {
        const { currentStep } = get();
        set({ currentStep: currentStep + 1 });
      },

      /**
       * 上一步
       */
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      /**
       * 跳过引导
       */
      skipTutorial: () => {
        set({
          isActive: false,
          isSkipped: true,
          skippedAt: new Date().toISOString(),
        });
      },

      /**
       * 完成引导
       */
      completeTutorial: () => {
        set({
          isActive: false,
          isCompleted: true,
          completedAt: new Date().toISOString(),
        });
      },

      /**
       * 重置引导（用于重新查看）
       */
      resetTutorial: () => {
        set({
          isActive: true,
          currentStep: 0,
          isCompleted: false,
          isSkipped: false,
          completedAt: undefined,
          skippedAt: undefined,
        });
      },

      /**
       * 关闭引导
       */
      closeTutorial: () => {
        set({ isActive: false });
      },

      /**
       * 跳转到指定步骤
       */
      goToStep: (step: number) => {
        set({ currentStep: step });
      },
    }),
    {
      name: 'legalmind-tutorial-storage',
      version: 1,
    }
  )
);

/**
 * 检查是否应该显示引导
 * 
 * 规则:
 * - 首次使用（未完成且未跳过）-> 显示
 * - 已完成或已跳过 -> 不显示
 * 
 * @returns 是否应该显示引导
 */
export const shouldShowTutorial = (): boolean => {
  const { isCompleted, isSkipped } = useTutorialStore.getState();
  return !isCompleted && !isSkipped;
};

/**
 * 获取引导进度
 * 
 * @param totalSteps 总步骤数
 * @returns 进度百分比（0-100）
 */
export const getTutorialProgress = (totalSteps: number): number => {
  const { currentStep } = useTutorialStore.getState();
  return Math.round(((currentStep + 1) / totalSteps) * 100);
};

