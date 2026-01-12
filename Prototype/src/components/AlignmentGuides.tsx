/**
 * 对齐辅助线组件
 * 在拖拽节点时显示对齐辅助线
 */

import React from 'react';
import { AlignmentGuide } from '../lib/layout-engine';
import { motion, AnimatePresence } from 'framer-motion';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  viewport: {
    zoom: number;
    origination?: [number, number];
  };
}

export const AlignmentGuides = React.memo<AlignmentGuidesProps>(
  ({ guides, viewport }) => {
    const zoom = viewport.zoom || 1;

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1000,
          overflow: 'visible',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left'
        }}
      >
        <AnimatePresence>
          {guides.map((guide, index) => {
            const isVertical = guide.type === 'vertical';
            const key = `${guide.type}-${guide.position}-${index}`;

            return (
              <motion.line
                key={key}
                x1={isVertical ? guide.position : 0}
                y1={isVertical ? 0 : guide.position}
                x2={isVertical ? guide.position : '100%'}
                y2={isVertical ? '100%' : guide.position}
                stroke="#FF6B35"
                strokeWidth={2 / zoom}
                strokeDasharray="4,4"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 0.8, pathLength: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(255, 107, 53, 0.8))',
                }}
              />
            );
          })}
        </AnimatePresence>
      </svg>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数：只有guides或viewport变化时才重新渲染
    return (
      prevProps.guides.length === nextProps.guides.length &&
      prevProps.guides.every((guide, index) =>
        guide.type === nextProps.guides[index]?.type &&
        guide.position === nextProps.guides[index]?.position
      ) &&
      prevProps.viewport.zoom === nextProps.viewport.zoom
    );
  }
);

AlignmentGuides.displayName = 'AlignmentGuides';

