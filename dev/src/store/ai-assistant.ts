// dev/src/store/ai-assistant.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIAssistantState {
  isVisible: boolean;
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  setVisible: (visible: boolean) => void;
  setOpen: (open: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
  toggleVisible: () => void;
  toggleOpen: () => void;
  toggleMinimized: () => void;
  reset: () => void;
}

export const useAIAssistantStore = create<AIAssistantState>()(
  persist(
    (set, get) => ({
      isVisible: true,
      isOpen: false,
      isMinimized: false,
      position: { x: 20, y: 100 }, // 使用固定初始位置，避免hydration mismatch

      setVisible: (visible) => set({ isVisible: visible }),
      setOpen: (open) => set({ isOpen: open }),
      setMinimized: (minimized) => set({ isMinimized: minimized }),
      setPosition: (position) => set({ position }),

      toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized })),

      reset: () => set({
        isOpen: false,
        isMinimized: false,
        // 保持 isVisible 和 position 不变
      }),
    }),
    {
      name: 'ai-assistant-storage',
      partialize: (state) => ({
        isVisible: state.isVisible,
        position: state.position,
      }),
    }
  )
);
