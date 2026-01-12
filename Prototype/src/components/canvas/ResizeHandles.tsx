/**
 * 缩放手柄组件
 * 
 * 显示在选中元素周围，支持8个方向的缩放
 */

import React, { useState, useCallback } from 'react';
import type { CanvasElement } from '../../types/canvas-elements';

interface ResizeHandlesProps {
  element: CanvasElement;
  onResize: (elementId: string, position: { x: number; y: number }, size: { width: number; height: number }) => void;
  zoom: number;
}

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  element,
  onResize,
  zoom,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startElementPosition, setStartElementPosition] = useState({ x: 0, y: 0 });
  const [keepAspectRatio, setKeepAspectRatio] = useState(false);

  /**
   * 开始缩放
   */
  const handleMouseDown = useCallback((direction: ResizeDirection, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    setResizeDirection(direction);
    setStartPosition({ x: e.clientX, y: e.clientY });
    setStartSize({ width: element.size.width, height: element.size.height });
    setStartElementPosition({ x: element.position.x, y: element.position.y });
    setKeepAspectRatio(e.shiftKey);

    console.log(`[缩放] 开始缩放元素: ${element.id}, 方向: ${direction}`);
  }, [element]);

  /**
   * 缩放中
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeDirection) return;

    // 计算鼠标移动距离
    const deltaX = (e.clientX - startPosition.x) / zoom;
    const deltaY = (e.clientY - startPosition.y) / zoom;

    // 计算新的尺寸和位置
    let newWidth = startSize.width;
    let newHeight = startSize.height;
    let newX = startElementPosition.x;
    let newY = startElementPosition.y;

    // 根据方向计算新尺寸
    switch (resizeDirection) {
      case 'nw': // 左上
        newWidth = startSize.width - deltaX;
        newHeight = startSize.height - deltaY;
        newX = startElementPosition.x + deltaX;
        newY = startElementPosition.y + deltaY;
        break;
      case 'n': // 上
        newHeight = startSize.height - deltaY;
        newY = startElementPosition.y + deltaY;
        break;
      case 'ne': // 右上
        newWidth = startSize.width + deltaX;
        newHeight = startSize.height - deltaY;
        newY = startElementPosition.y + deltaY;
        break;
      case 'e': // 右
        newWidth = startSize.width + deltaX;
        break;
      case 'se': // 右下
        newWidth = startSize.width + deltaX;
        newHeight = startSize.height + deltaY;
        break;
      case 's': // 下
        newHeight = startSize.height + deltaY;
        break;
      case 'sw': // 左下
        newWidth = startSize.width - deltaX;
        newHeight = startSize.height + deltaY;
        newX = startElementPosition.x + deltaX;
        break;
      case 'w': // 左
        newWidth = startSize.width - deltaX;
        newX = startElementPosition.x + deltaX;
        break;
    }

    // 保持宽高比
    if (keepAspectRatio || e.shiftKey) {
      const aspectRatio = startSize.width / startSize.height;
      
      // 根据方向决定以哪个维度为准
      if (['nw', 'ne', 'se', 'sw'].includes(resizeDirection)) {
        // 角落：以宽度为准
        newHeight = newWidth / aspectRatio;
        
        // 调整位置（如果是上方的角）
        if (resizeDirection === 'nw' || resizeDirection === 'ne') {
          newY = startElementPosition.y + (startSize.height - newHeight);
        }
      } else if (['n', 's'].includes(resizeDirection)) {
        // 上下：以高度为准，调整宽度
        newWidth = newHeight * aspectRatio;
        newX = startElementPosition.x - (newWidth - startSize.width) / 2;
      } else {
        // 左右：以宽度为准，调整高度
        newHeight = newWidth / aspectRatio;
        newY = startElementPosition.y - (newHeight - startSize.height) / 2;
      }
    }

    // 最小尺寸限制
    const MIN_SIZE = 20;
    if (newWidth < MIN_SIZE) {
      newWidth = MIN_SIZE;
      if (resizeDirection.includes('w')) {
        newX = startElementPosition.x + startSize.width - MIN_SIZE;
      }
    }
    if (newHeight < MIN_SIZE) {
      newHeight = MIN_SIZE;
      if (resizeDirection.includes('n')) {
        newY = startElementPosition.y + startSize.height - MIN_SIZE;
      }
    }

    // 更新元素
    onResize(element.id, { x: newX, y: newY }, { width: newWidth, height: newHeight });
  }, [isResizing, resizeDirection, startPosition, startSize, startElementPosition, keepAspectRatio, zoom, element.id, onResize]);

  /**
   * 结束缩放
   */
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection(null);
      console.log(`[缩放] 结束缩放元素: ${element.id}`);
    }
  }, [isResizing, element.id]);

  // 注册全局事件监听
  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 手柄大小
  const handleSize = 8 / zoom;
  const handleOffset = handleSize / 2;

  // 8个方向的手柄位置
  const handles: Array<{ direction: ResizeDirection; x: number; y: number; cursor: string }> = [
    { direction: 'nw', x: element.position.x - handleOffset, y: element.position.y - handleOffset, cursor: 'nwse-resize' },
    { direction: 'n', x: element.position.x + element.size.width / 2 - handleOffset, y: element.position.y - handleOffset, cursor: 'ns-resize' },
    { direction: 'ne', x: element.position.x + element.size.width - handleOffset, y: element.position.y - handleOffset, cursor: 'nesw-resize' },
    { direction: 'e', x: element.position.x + element.size.width - handleOffset, y: element.position.y + element.size.height / 2 - handleOffset, cursor: 'ew-resize' },
    { direction: 'se', x: element.position.x + element.size.width - handleOffset, y: element.position.y + element.size.height - handleOffset, cursor: 'nwse-resize' },
    { direction: 's', x: element.position.x + element.size.width / 2 - handleOffset, y: element.position.y + element.size.height - handleOffset, cursor: 'ns-resize' },
    { direction: 'sw', x: element.position.x - handleOffset, y: element.position.y + element.size.height - handleOffset, cursor: 'nesw-resize' },
    { direction: 'w', x: element.position.x - handleOffset, y: element.position.y + element.size.height / 2 - handleOffset, cursor: 'ew-resize' },
  ];

  return (
    <>
      {/* 选择框 */}
      <rect
        x={element.position.x}
        y={element.position.y}
        width={element.size.width}
        height={element.size.height}
        fill="none"
        stroke="#f97316"
        strokeWidth={2 / zoom}
        strokeDasharray={`${4 / zoom} ${4 / zoom}`}
        pointerEvents="none"
      />

      {/* 8个缩放手柄 */}
      {handles.map(handle => (
        <rect
          key={handle.direction}
          x={handle.x}
          y={handle.y}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke="#f97316"
          strokeWidth={2 / zoom}
          cursor={handle.cursor}
          onMouseDown={(e) => handleMouseDown(handle.direction, e)}
        />
      ))}

      {/* 缩放比例显示 */}
      {isResizing && (
        <text
          x={element.position.x + element.size.width / 2}
          y={element.position.y - 20 / zoom}
          fill="#f97316"
          fontSize={12 / zoom}
          textAnchor="middle"
          pointerEvents="none"
        >
          {Math.round(element.size.width)} × {Math.round(element.size.height)}
          {(keepAspectRatio || false) && ' (锁定比例)'}
        </text>
      )}
    </>
  );
};

