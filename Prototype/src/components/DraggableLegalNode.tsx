
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

import { detectAlignmentGuides, AlignmentGuide } from '../lib/layout-engine';
import { typographyClasses } from '../styles/typography';

import type { LegalNode } from './workspace/types';

import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';

import { useSelectionStore } from '../stores/selection-store';
import { useNodeAnimation } from '../lib/node-animations';
import { NODE_TYPE_CONFIG } from './workspace/config';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { DocumentNodeContent } from './nodes/DocumentNodeContent';
import { TimelineNodeContent, EvidenceNodeContent, IssueNodeContent } from './nodes/LegalSpecificNodes';
import { TimelineMetadata, EvidenceMetadata, IssueMetadata } from './workspace/types';

interface DraggableLegalNodeProps {
  node: LegalNode;
  isSelected: boolean;
  selectedNodeIds: string[];
  onSelect: () => void;
  onDoubleClick: () => void;
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  viewport: { zoom: number; x: number; y: number };
  isConnecting: boolean;
  isConnectionStart: boolean;
  allNodes: LegalNode[];
  onAlignmentGuidesChange: (guides: AlignmentGuide[]) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onDocumentPreview?: (nodeId: string) => void;
  onDocumentDownload?: (nodeId: string) => void;
  onConnectionStart?: (nodeId: string) => void; // {{ AURA: Add - 连接开始回调 }}
}

export const DraggableLegalNode = React.memo<DraggableLegalNodeProps>(({
  node,
  isSelected,
  onSelect,
  onDoubleClick,
  onPositionChange,
  viewport: _viewport,
  isConnecting,
  isConnectionStart,
  onConnectionStart, // AURA: Add - 连接开始回调
  allNodes,
  onAlignmentGuidesChange,
  onContextMenu,
  onDocumentPreview,
  onDocumentDownload
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false); // AURA: Add - 悬停状态

  // Motion Values for Position
  // We use motion values to decouple the visual position from the React state during drag
  const x = useMotionValue(node.data.position.x);
  const y = useMotionValue(node.data.position.y);

  // Sync motion values with props when NOT dragging
  useEffect(() => {
    if (!isDragging) {
      x.set(node.data.position.x);
      y.set(node.data.position.y);
    }
  }, [node.data.position.x, node.data.position.y, isDragging, x, y]);

  // Framer Motion for smooth visuals
  const scale = useSpring(1, { stiffness: 300, damping: 20 });
  const shadow = useSpring(0, { stiffness: 300, damping: 20 });

  // Update visuals based on state
  useEffect(() => {
    if (isDragging) {
      scale.set(1.05);
      shadow.set(1);
    } else {
      scale.set(1);
      shadow.set(isSelected ? 0.5 : 0);
    }
  }, [isDragging, isSelected, scale, shadow]);

  // Node Animation Hook
  useNodeAnimation(node.id, {
    create: { duration: 300, enabled: true },
    delete: { duration: 200, enabled: true },
    move: { duration: 250, enabled: true },
    select: { duration: 150, enabled: true },
  });

  const { getNodeSelectors } = useSelectionStore();
  const otherSelectors = useMemo(() => {
    return getNodeSelectors(node.id);
  }, [node.id, getNodeSelectors]);

  // Node Config
  const config = useMemo(() => {
    const typeConfig = NODE_TYPE_CONFIG[node.type as keyof typeof NODE_TYPE_CONFIG];
    return typeConfig || NODE_TYPE_CONFIG['legal-case'];
  }, [node.type]);

  const IconComponent = config.icon;

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onSelect();
  }, [onSelect]);

  const handleDrag = useCallback((_: any, _info: any) => {
    // info.point is the pointer position relative to the viewport
    // But since we are using 'drag' with 'style={{ x, y }}', Framer updates x and y motion values automatically!
    // We just need to read them and update the store for connections.

    // However, Framer's 'drag' usually applies a transform (translate).
    // If we bind 'style={{ x, y }}', Framer updates these values.

    const currentX = x.get();
    const currentY = y.get();

    // Update store (for connections)
    onPositionChange(node.id, { x: currentX, y: currentY });

    // Alignment Guides
    if (allNodes.length > 0 && onAlignmentGuidesChange) {
      const guides = detectAlignmentGuides(
        { id: node.id, x: currentX, y: currentY },
        allNodes.map(n => ({
          ...n,
          position: n.data.position,
          metadata: n.data.metadata
        })) as any
      );
      onAlignmentGuidesChange(guides);
    }
  }, [node.id, onPositionChange, allNodes, onAlignmentGuidesChange, x, y]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (onAlignmentGuidesChange) {
      onAlignmentGuidesChange([]);
    }
    // Final sync to ensure precision
    onPositionChange(node.id, { x: x.get(), y: y.get() });
  }, [onAlignmentGuidesChange, onPositionChange, node.id, x, y]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!isDragging && !isSelected) {
      scale.set(1.02);
      shadow.set(0.2);
    }
  }, [isDragging, isSelected, scale, shadow]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isDragging && !isSelected) {
      scale.set(1);
      shadow.set(0);
    }
  }, [isDragging, isSelected, scale, shadow]);

  const handleDoubleClickEvent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick();
  }, [onDoubleClick]);

  // AURA: Add - 连接手柄点击处理
  const handleConnectionStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectionStart?.(node.id);
  }, [onConnectionStart, node.id]);

  const isCaseNode = node.type === 'legal-case';
  const caseNodeStyles = isCaseNode ? 'w-60' : 'w-50';

  return (
    <motion.div
      ref={nodeRef}
      data-node-id={node.id}
      className={`absolute pointer-events-auto ${isDragging ? 'z-50' : 'z-30'}`}

      // Native Drag Configuration
      drag
      dragMomentum={true}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}

      // Bind Motion Values
      style={{
        x,
        y,
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: isDragging ? 'grabbing' : 'grab',
        scale: scale,
        zIndex: isDragging ? 100 : isSelected ? 50 : 10,
      }}

      onClick={handleClick}
      onDoubleClick={handleDoubleClickEvent}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, node.id);
      }}
      initial={false}
    >
      {/* High-Tech Glow Effect */}
      <AnimatePresence>
        {(isSelected || isDragging) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 rounded-xl bg-orange-400/20 blur-xl -z-10"
          />
        )}
      </AnimatePresence>

      {/* AURA: Add - 连接手柄 (仅悬停或连接时显示) */}
      <AnimatePresence>
        {(isHovered || isConnecting) && !isDragging && (
          <>
            {/* Top Handle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full cursor-crosshair z-50 hover:scale-150 hover:bg-orange-500 transition-transform"
              onMouseDown={handleConnectionStart}
            />
            {/* Right Handle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute top-1/2 -right-3 -translate-y-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full cursor-crosshair z-50 hover:scale-150 hover:bg-orange-500 transition-transform"
              onMouseDown={handleConnectionStart}
            />
            {/* Bottom Handle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full cursor-crosshair z-50 hover:scale-150 hover:bg-orange-500 transition-transform"
              onMouseDown={handleConnectionStart}
            />
            {/* Left Handle */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute top-1/2 -left-3 -translate-y-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full cursor-crosshair z-50 hover:scale-150 hover:bg-orange-500 transition-transform"
              onMouseDown={handleConnectionStart}
            />
          </>
        )}
      </AnimatePresence>

      <Card
        className={`${caseNodeStyles} transition-colors duration-200 bg-white/90 backdrop-blur-xl border-2 overflow-hidden`}
        style={{
          borderColor: isDragging ? '#f97316' : isSelected ? '#fb923c' : 'rgba(229, 231, 235, 0.8)',
          boxShadow: isDragging
            ? '0 20px 40px -10px rgba(249, 115, 22, 0.3)'
            : isSelected
              ? '0 10px 30px -5px rgba(251, 146, 60, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardHeader className={`pb-3 ${isCaseNode
          ? 'bg-gradient-to-br from-orange-100/90 via-orange-50/80 to-white/70'
          : 'bg-gradient-to-br from-orange-50/70 via-white/60 to-orange-50/40'
          } `}>
          <div className="flex items-center gap-3">
            <div className={`${isCaseNode ? 'w-14 h-14' : 'w-10 h-10'
              } rounded-xl ${config.color} flex items-center justify-center shadow-lg ${isCaseNode ? 'ring-2 ring-orange-300 ring-offset-2' : ''
              } `}>
              <IconComponent className={`${isCaseNode ? 'w-7 h-7' : 'w-5 h-5'
                } text-white`} />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className={`${typographyClasses.title} flex-1 line-clamp-2 select-none`}>
                    {node.data.title}
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{node.data.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {node.type === 'legal-document' && node.data.metadata ? (
            <DocumentNodeContent
              data={node.data.metadata as any}
              onPreview={() => onDocumentPreview?.(node.id)}
              onDownload={() => onDocumentDownload?.(node.id)}
            />
          ) : node.type === 'legal-timeline' && node.data.metadata ? (
            <TimelineNodeContent data={node.data.metadata as TimelineMetadata} />
          ) : node.type === 'legal-evidence' && node.data.metadata ? (
            <EvidenceNodeContent data={node.data.metadata as EvidenceMetadata} />
          ) : node.type === 'legal-issue' && node.data.metadata ? (
            <IssueNodeContent data={node.data.metadata as IssueMetadata} />
          ) : (
            <>
              <p className={`${typographyClasses.content} line-clamp-3 mb-3 select-none`}>
                {node.data.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Badge
                  variant="secondary"
                  className={`text-xs font-medium leading-normal ${node.data.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                    node.data.status === 'completed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      node.data.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                    } border`}
                >
                  {node.data.status === 'active' ? '进行中' :
                    node.data.status === 'completed' ? '已完成' :
                      node.data.status === 'cancelled' ? '已取消' : '待处理'}
                </Badge>
                <span className="text-xs font-medium leading-normal text-gray-600 select-none">
                  {node.data.connections.length} 连接
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Connection Indicators */}
      <AnimatePresence>
        {isConnecting && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg border-2 border-white"
          >
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" />
          </motion.div>
        )}
      </AnimatePresence>

      {isConnectionStart && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-500 rounded-full shadow-lg border-2 border-white">
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping" />
        </div>
      )}

      {/* Collaborator Indicators */}
      {otherSelectors.length > 0 && (
        <>
          {otherSelectors.map((selector, index) => (
            <motion.div
              key={selector.userId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                border: `3px solid ${selector.userColor} `,
                boxShadow: `0 0 0 1px ${selector.userColor} 40`,
                zIndex: -1 - index,
              }}
            />
          ))}

          <div className="absolute -top-8 left-0 flex gap-1">
            {otherSelectors.map((selector) => (
              <motion.div
                key={selector.userId}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-md"
                style={{ backgroundColor: selector.userColor }}
              >
                {selector.userName} 正在编辑
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
});
