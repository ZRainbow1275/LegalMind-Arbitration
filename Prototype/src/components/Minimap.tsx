/**
 * Minimap导航组件 - 优化版
 * 在左下角显示画布缩略图，高亮当前视口位置
 * 避免与右侧UI元素冲突
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LegalNode } from '../types/shared';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface MinimapProps {
  nodes: LegalNode[];
  viewport: { zoom: number; x: number; y: number };
  canvasSize: { width: number; height: number };
  onViewportChange: (viewport: { x: number; y: number }) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  viewport,
  canvasSize,
  onViewportChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Minimap尺寸
  const minimapWidth = isExpanded ? 300 : 200;
  const minimapHeight = isExpanded ? 200 : 150;

  // 计算缩放比例
  const scale = Math.min(
    minimapWidth / canvasSize.width,
    minimapHeight / canvasSize.height
  );

  // 绘制Minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, minimapWidth, minimapHeight);

    // 绘制背景
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, minimapWidth, minimapHeight);

    // 绘制网格
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.3)';
    ctx.lineWidth = 0.5;
    const gridSize = 50 * scale;
    for (let x = 0; x < minimapWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, minimapHeight);
      ctx.stroke();
    }
    for (let y = 0; y < minimapHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(minimapWidth, y);
      ctx.stroke();
    }

    // 绘制节点
    nodes.forEach((node) => {
      if (!node.data) return;
      const x = node.data.position.x * scale;
      const y = node.data.position.y * scale;
      // 优化后的节点尺寸：案件节点240px，其他节点200px
      const isCaseNode = node.type === 'case';
      const width = (isCaseNode ? 240 : 200) * scale;
      const height = 180 * scale; // 节点高度

      // 节点背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - width / 2, y - height / 2, width, height);

      // 节点边框
      ctx.strokeStyle = getNodeColor(node.type);
      ctx.lineWidth = 2;
      ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    });

    // 绘制视口矩形
    const viewportWidth = (window.innerWidth / viewport.zoom) * scale;
    const viewportHeight = (window.innerHeight / viewport.zoom) * scale;
    const viewportX = (-viewport.x / viewport.zoom) * scale;
    const viewportY = (-viewport.y / viewport.zoom) * scale;

    // 视口背景（半透明）
    ctx.fillStyle = 'rgba(255, 107, 53, 0.1)';
    ctx.fillRect(viewportX, viewportY, viewportWidth, viewportHeight);

    // 视口边框
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);

    // 视口角标
    const cornerSize = 8;
    ctx.fillStyle = '#FF6B35';
    // 左上角
    ctx.fillRect(viewportX - cornerSize / 2, viewportY - cornerSize / 2, cornerSize, cornerSize);
    // 右上角
    ctx.fillRect(viewportX + viewportWidth - cornerSize / 2, viewportY - cornerSize / 2, cornerSize, cornerSize);
    // 左下角
    ctx.fillRect(viewportX - cornerSize / 2, viewportY + viewportHeight - cornerSize / 2, cornerSize, cornerSize);
    // 右下角
    ctx.fillRect(viewportX + viewportWidth - cornerSize / 2, viewportY + viewportHeight - cornerSize / 2, cornerSize, cornerSize);
  }, [nodes, viewport, canvasSize, scale, minimapWidth, minimapHeight]);

  // 获取节点颜色
  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'case': '#3b82f6',
      'person': '#10b981',
      'evidence': '#8b5cf6',
      'hearing': '#f97316',
      'timeline': '#ec4899',
      'ai': '#06b6d4',
    };
    return colors[type] || '#6b7280';
  };

  // 处理点击/拖拽
  const handleViewportMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 转换为画布坐标
    const canvasX = (x / scale) * viewport.zoom;
    const canvasY = (y / scale) * viewport.zoom;

    // 计算新的视口位置（居中）
    const newViewportX = -(canvasX - window.innerWidth / 2);
    const newViewportY = -(canvasY - window.innerHeight / 2);

    onViewportChange({ x: newViewportX, y: newViewportY });
  }, [scale, viewport.zoom, onViewportChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleViewportMove(e);
  }, [handleViewportMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleViewportMove(e);
  }, [isDragging, handleViewportMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);



  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-40 w-12 h-12 rounded-lg bg-white/95 backdrop-blur-md
          border-2 border-orange-300 shadow-lg hover:shadow-xl transition-all duration-200
          flex items-center justify-center text-orange-600 hover:text-orange-700"
        title="显示画布导航"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 bg-white/95 backdrop-blur-md rounded-xl
        border-2 border-orange-300 shadow-2xl transition-all duration-300 ${isExpanded ? 'p-4' : 'p-3'
        }`}
      style={{
        width: minimapWidth + (isExpanded ? 32 : 24),
        boxShadow: '0 0 30px rgba(255, 107, 53, 0.2), 0 10px 40px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-gray-700">画布导航</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-6 h-6 rounded hover:bg-orange-50 flex items-center justify-center
              text-gray-600 hover:text-orange-600 transition-colors"
            title={isExpanded ? '缩小' : '放大'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 rounded hover:bg-orange-50 flex items-center justify-center
              text-gray-600 hover:text-orange-600 transition-colors"
            title="隐藏"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Minimap画布 */}
      <canvas
        ref={canvasRef}
        width={minimapWidth}
        height={minimapHeight}
        className="rounded-lg cursor-pointer border border-gray-200"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* {{ AURA: Delete - 移除信息栏，避免与StatusBar重复显示 }} */}
    </div>
  );
};

