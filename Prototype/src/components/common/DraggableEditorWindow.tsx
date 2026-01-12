/**
 * 可拖拽的编辑器窗口容器
 * 
 * 提供拖拽功能的编辑器窗口包装器
 */

import React, { useState, useEffect } from 'react';
import { LegalNodeEditor } from '../LegalNodeEditor';
import type { LegalNode } from '../workspace/types';

interface DraggableEditorWindowProps {
  node: LegalNode;
  index: number;
  onClose: (nodeId: string) => void;
  onSave: (nodeId: string, updates: Partial<LegalNode>) => void;
  onDelete: (nodeId: string) => void;
}

export const DraggableEditorWindow: React.FC<DraggableEditorWindowProps> = ({
  node,
  index,
  onClose,
  onSave,
  onDelete,
}) => {
  // {{ AURA: Add - 为每个编辑器窗口添加拖拽功能 }}
  const [position, setPosition] = useState({
    right: 20 + index * 20,
    top: 80 + index * 20
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // 只在标题栏上启用拖拽
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot="card-header"]')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition(prev => ({
        right: Math.max(0, prev.right - dx),
        top: Math.max(0, prev.top + dy)
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div
      className={`fixed animate-fade-in ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        right: `${position.right}px`,
        top: `${position.top}px`,
        zIndex: 50 + index, // 后打开的窗口在上层
      }}
      onMouseDown={handleMouseDown}
    >
      <LegalNodeEditor
        node={node}
        isOpen={true}
        onClose={() => onClose(node.id)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
};

