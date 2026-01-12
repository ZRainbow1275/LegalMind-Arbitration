/**
 * 旋转手柄组件
 * 
 * 显示在选中元素周围，支持鼠标拖拽旋转
 */

import React, { useState, useCallback } from 'react';
import type { CanvasElement } from '../../types/canvas-elements';

interface RotationHandleProps {
  element: CanvasElement;
  onRotate: (elementId: string, rotation: number) => void;
  zoom: number;
}

export const RotationHandle: React.FC<RotationHandleProps> = ({
  element,
  onRotate,
  zoom,
}) => {
  const [isRotating, setIsRotating] = useState(false);
  const [startAngle, setStartAngle] = useState(0);

  /**
   * 计算鼠标相对于元素中心的角度
   */
  const calculateAngle = useCallback((e: MouseEvent, element: CanvasElement) => {
    // 元素中心点
    const centerX = element.position.x + element.size.width / 2;
    const centerY = element.position.y + element.size.height / 2;

    // 鼠标相对于中心点的位置
    const deltaX = e.clientX / zoom - centerX;
    const deltaY = e.clientY / zoom - centerY;

    // 计算角度（弧度转角度）
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    return angle;
  }, [zoom]);

  /**
   * 开始旋转
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsRotating(true);
    setStartAngle(calculateAngle(e.nativeEvent, element));

    console.log('[旋转] 开始旋转元素:', element.id);
  }, [element, calculateAngle]);

  /**
   * 旋转中
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isRotating) return;

    const currentAngle = calculateAngle(e, element);
    const deltaAngle = currentAngle - startAngle;

    // 计算新的旋转角度
    const newRotation = ((element.rotation || 0) + deltaAngle) % 360;

    // 更新元素旋转角度
    onRotate(element.id, newRotation);

    // 更新起始角度
    setStartAngle(currentAngle);
  }, [isRotating, element, startAngle, calculateAngle, onRotate]);

  /**
   * 结束旋转
   */
  const handleMouseUp = useCallback(() => {
    if (isRotating) {
      setIsRotating(false);
      console.log('[旋转] 结束旋转元素:', element.id);
    }
  }, [isRotating, element.id]);

  // 注册全局事件监听
  React.useEffect(() => {
    if (isRotating) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isRotating, handleMouseMove, handleMouseUp]);

  // 旋转手柄的位置（在元素上方）
  const handleX = element.position.x + element.size.width / 2;
  const handleY = element.position.y - 30 / zoom; // 30像素上方

  return (
    <>
      {/* 连接线 */}
      <line
        x1={element.position.x + element.size.width / 2}
        y1={element.position.y}
        x2={handleX}
        y2={handleY}
        stroke="#f97316"
        strokeWidth={1 / zoom}
        pointerEvents="none"
      />

      {/* 旋转手柄 */}
      <circle
        cx={handleX}
        cy={handleY}
        r={6 / zoom}
        fill="#ffffff"
        stroke="#f97316"
        strokeWidth={2 / zoom}
        cursor="grab"
        onMouseDown={handleMouseDown}
        style={{
          cursor: isRotating ? 'grabbing' : 'grab',
        }}
      />

      {/* 旋转角度显示 */}
      {isRotating && (
        <text
          x={handleX}
          y={handleY - 15 / zoom}
          fill="#f97316"
          fontSize={12 / zoom}
          textAnchor="middle"
          pointerEvents="none"
        >
          {Math.round(element.rotation || 0)}°
        </text>
      )}
    </>
  );
};

