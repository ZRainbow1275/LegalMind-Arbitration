// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities for legal documents
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Case status utilities
export function getCaseStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'draft': 'text-neutral-500',
    'submitted': 'text-info-500',
    'accepted': 'text-primary-500',
    'payment_pending': 'text-warning-500',
    'tribunal_formation': 'text-primary-600',
    'pre_hearing': 'text-primary-700',
    'hearing_scheduled': 'text-success-500',
    'hearing_in_progress': 'text-success-600',
    'deliberation': 'text-primary-800',
    'award_issued': 'text-success-700',
    'completed': 'text-success-800',
    'terminated': 'text-error-500',
  };
  return statusColors[status] || 'text-neutral-500';
}

export function getCaseStatusText(status: string): string {
  const statusTexts: Record<string, string> = {
    'draft': '草稿',
    'submitted': '已提交',
    'accepted': '已受理',
    'payment_pending': '待缴费',
    'tribunal_formation': '组建仲裁庭',
    'pre_hearing': '庭前准备',
    'hearing_scheduled': '已排期',
    'hearing_in_progress': '庭审中',
    'deliberation': '合议中',
    'award_issued': '已裁决',
    'completed': '已完成',
    'terminated': '已终止',
  };
  return statusTexts[status] || '未知状态';
}

// File size formatting
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Currency formatting for arbitration fees
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
}

// Time remaining calculation
export function getTimeRemaining(deadline: Date | string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return '已过期';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

// Generate case number - 使用时间戳避免hydration mismatch
let caseNumberCounter = 0;
export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const sequential = (++caseNumberCounter).toString().padStart(4, '0');
  return `赣仲${year}第${sequential}号`;
}
