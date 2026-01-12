/**
 * 实时光标渲染组件
 * 显示其他协作者的鼠标光标
 */

import React from 'react';
import { useCursorStore } from '../../stores/cursor-store';
import type { UserCursor } from '../../types/cursor';

interface CursorRendererProps {
  scale: number; // 画布缩放比例
  offset?: { x: number; y: number }; // 画布偏移量
}

/**
 * 单个光标组件
 */
const Cursor: React.FC<{ cursor: UserCursor; scale: number; offset?: { x: number; y: number } }> = ({ cursor, scale, offset = { x: 0, y: 0 } }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${cursor.position.x * scale + offset.x}px`,
    top: `${cursor.position.y * scale + offset.y}px`,
    transform: `scale(1)`, // 光标本身不缩放，但位置跟随缩放
    transformOrigin: 'top left',
    pointerEvents: 'none',
    zIndex: 1000,
    transition: 'left 0.1s ease-out, top 0.1s ease-out', // 平滑动画
  };

  return (
    <div style={style} className="cursor-wrapper">
      {/* 光标SVG图标 */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        {/* 光标主体 */}
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill={cursor.userColor}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* 用户名称标签 */}
      <div
        className="absolute left-6 top-0 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
        style={{
          backgroundColor: cursor.userColor,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {cursor.userName}
      </div>
    </div>
  );
};

/**
 * 光标渲染器组件
 */
export const CursorRenderer: React.FC<CursorRendererProps> = ({ scale, offset }) => {
  const { getAllCursors } = useCursorStore();
  // 过滤掉当前用户的光标，避免本地渲染延迟
  const cursors = getAllCursors().filter(c => c.userId !== 'current-user');

  if (cursors.length === 0) {
    return null;
  }

  return (
    <>
      <LocalCursorLabel />
      {cursors.map((cursor) => (
        <Cursor
          key={cursor.userId}
          cursor={cursor}
          scale={scale}
          offset={offset}
        />
      ))}
    </>
  );
};

/**
 * 本地用户光标标签
 * 跟随鼠标移动，不依赖React状态更新，保证高性能
 */
const LocalCursorLabel: React.FC = () => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (ref.current) {
        // 偏移一点距离，避免遮挡光标
        ref.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 pointer-events-none z-[1001] transition-opacity duration-200"
      style={{ willChange: 'transform' }}
    >
      <div
        className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
        style={{ backgroundColor: '#3b82f6' }}
      >
        Me
      </div>
    </div>
  );
};

CursorRenderer.displayName = 'CursorRenderer';
