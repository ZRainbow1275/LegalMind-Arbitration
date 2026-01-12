/**
 * LegalMind法律工作台 - 画布操作Hook
 * 
 * 处理画布的缩放、平移、适应屏幕等操作
 */

import { useCallback, useRef } from 'react';
import { PlaitCanvasWrapperRef } from '../../PlaitCanvasWrapper';
import { LegalNode } from '../types';
import { calculateBoundingBox } from '../utils';

/**
 * 画布操作Hook
 * 
 * @param nodes 节点列表
 * @returns 画布操作函数集合
 */
export const useWorkspaceCanvas = (nodes: LegalNode[]) => {
  // 画布引用
  const canvasRef = useRef<PlaitCanvasWrapperRef>(null);

  /**
   * 放大画布
   */
  const handleZoomIn = useCallback(() => {
    if (canvasRef.current) {
      try {
        const viewport = canvasRef.current.getViewport();
        const newZoom = Math.min(viewport.zoom * 1.2, 3); // 最大3倍缩放
        canvasRef.current.zoomTo(newZoom);
      } catch (error) {
        console.warn('[Zoom In] Failed:', error);
      }
    }
  }, []);

  /**
   * 缩小画布
   */
  const handleZoomOut = useCallback(() => {
    if (canvasRef.current) {
      try {
        const viewport = canvasRef.current.getViewport();
        const newZoom = Math.max(viewport.zoom * 0.8, 0.1); // 最小0.1倍缩放
        canvasRef.current.zoomTo(newZoom);
      } catch (error) {
        console.warn('[Zoom Out] Failed:', error);
      }
    }
  }, []);

  /**
   * 重置视图
   */
  const handleResetView = useCallback(() => {
    if (canvasRef.current) {
      try {
        canvasRef.current.zoomTo(1);
        canvasRef.current.moveTo({ x: 0, y: 0 });
      } catch (error) {
        console.warn('[Reset View] Failed:', error);
      }
    }
  }, []);

  /**
   * 适应屏幕
   */
  const handleFitToScreen = useCallback(() => {
    if (canvasRef.current && nodes.length > 0) {
      try {
        const bbox = calculateBoundingBox(nodes);
        const padding = 50;

        // 获取画布容器尺寸
        const container = (canvasRef.current.getBoard() as any)?.host;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 计算缩放比例
        const contentWidth = bbox.maxX - bbox.minX + padding * 2;
        const contentHeight = bbox.maxY - bbox.minY + padding * 2;

        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不超过1倍

        // 计算居中位置
        const centerX = (bbox.minX + bbox.maxX) / 2;
        const centerY = (bbox.minY + bbox.maxY) / 2;

        const offsetX = containerWidth / 2 - centerX * scale;
        const offsetY = containerHeight / 2 - centerY * scale;

        canvasRef.current.zoomTo(scale);
        canvasRef.current.moveTo({ x: offsetX, y: offsetY });
      } catch (error) {
        console.warn('[Fit To Screen] Failed:', error);
      }
    }
  }, [nodes]);

  /**
   * 缩放到指定比例
   */
  const zoomTo = useCallback((zoom: number) => {
    if (canvasRef.current) {
      try {
        canvasRef.current.zoomTo(zoom);
      } catch (error) {
        console.warn('[Zoom To] Failed:', error);
      }
    }
  }, []);

  /**
   * 移动到指定位置
   */
  const moveTo = useCallback((position: { x: number; y: number }) => {
    if (canvasRef.current) {
      try {
        canvasRef.current.moveTo(position);
      } catch (error) {
        console.warn('[Move To] Failed:', error);
      }
    }
  }, []);

  /**
   * 获取当前视口
   */
  const getViewport = useCallback(() => {
    if (canvasRef.current) {
      try {
        return canvasRef.current.getViewport();
      } catch (error) {
        console.warn('[Get Viewport] Failed:', error);
        return { zoom: 1, x: 0, y: 0 };
      }
    }
    return { zoom: 1, x: 0, y: 0 };
  }, []);

  /**
   * 获取Board实例
   */
  const getBoard = useCallback(() => {
    if (canvasRef.current) {
      try {
        return canvasRef.current.getBoard();
      } catch (error) {
        console.warn('[Get Board] Failed:', error);
        return null;
      }
    }
    return null;
  }, []);

  return {
    canvasRef,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleFitToScreen,
    zoomTo,
    moveTo,
    getViewport,
    getBoard,
  };
};

