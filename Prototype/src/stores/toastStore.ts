
import { create } from 'zustand';

// ==================== 类型定义 ====================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

// ==================== Store ====================

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration || 3000,
        };

        set((state) => ({
            toasts: [...state.toasts, newToast],
        }));

        // 自动移除
        if ((newToast.duration || 0) > 0) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, newToast.duration || 3000);
        }
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },
}));

// ==================== 辅助函数 ====================

export const toast = {
    success: (title: string, message?: string, duration?: number) => {
        useToastStore.getState().addToast({ type: 'success', title, message, duration });
    },

    error: (title: string, message?: string, duration?: number) => {
        useToastStore.getState().addToast({ type: 'error', title, message, duration });
    },

    warning: (title: string, message?: string, duration?: number) => {
        useToastStore.getState().addToast({ type: 'warning', title, message, duration });
    },

    info: (title: string, message?: string, duration?: number) => {
        useToastStore.getState().addToast({ type: 'info', title, message, duration });
    },
};
