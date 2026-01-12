/**
 * Tutorial Overlay Component - 新手引导遮罩层组件
 * 
 * 功能:
 * - 显示半透明遮罩层
 * - 高亮显示目标元素
 * - 阻止用户与其他元素交互
 * 
 * @author AI Agent
 * @date 2025-11-07
 */

import React, { useEffect, useState } from 'react';

interface TutorialOverlayProps {
  /** 目标元素选择器 */
  target?: string;
  /** 是否显示遮罩 */
  show: boolean;
}

/**
 * 计算高亮区域
 */
const calculateHighlight = (target: string | undefined): React.CSSProperties | null => {
  if (!target) {
    return null;
  }

  const element = document.querySelector(target);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const padding = 8;

  return {
    position: 'fixed',
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
    border: '2px solid #f97316',
    borderRadius: '8px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'none',
    zIndex: 10000,
    transition: 'all 0.3s ease-in-out',
  };
};

/**
 * 新手引导遮罩层组件
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ target, show }) => {
  const [highlight, setHighlight] = useState<React.CSSProperties | null>(null);

  useEffect(() => {
    if (!show) {
      setHighlight(null);
      return;
    }

    const updateHighlight = () => {
      const newHighlight = calculateHighlight(target);
      setHighlight(newHighlight);
    };

    // 延迟更新，确保DOM已渲染
    setTimeout(updateHighlight, 100);

    // 监听窗口大小变化和滚动
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [target, show]);

  if (!show) {
    return null;
  }

  return (
    <>
      {/* 遮罩层 */}
      {!target && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[10000] transition-opacity duration-300"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* 高亮区域 */}
      {highlight && <div style={highlight} />}
    </>
  );
};

