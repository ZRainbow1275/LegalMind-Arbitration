/**
 * 元素渲染器
 * 
 * 根据元素类型渲染不同的组件
 */

import React from 'react';
import type { CanvasElement } from '../../types/shared';

// ==================== 渲染器组件 ====================

interface ElementRendererProps {
  element: CanvasElement;
  selected?: boolean;
  onSelect?: (id: string, e?: React.MouseEvent) => void;
  onUpdate?: (id: string, updates: Partial<CanvasElement>) => void;
  onMouseDown?: (id: string, e: React.MouseEvent) => void;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  selected = false,
  onSelect,
  // onUpdate,
  onMouseDown,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(element.id, e);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown?.(element.id, e);
  };

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.position.x,
    top: element.position.y,
    width: element.size.width,
    height: element.size.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    opacity: element.opacity ?? 1,
    zIndex: element.zIndex ?? 0,
    cursor: 'move', // 改为move光标表示可拖拽
    outline: selected ? '2px solid #f97316' : 'none',
    outlineOffset: '2px',
  };

  // 根据类型渲染不同的元素
  switch (element.type) {
    case 'frame':
      return <FrameRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'group':
      return <GroupRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'text':
      return <TextRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'image':
      return <ImageRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'shape':
      return <ShapeRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'table':
      return <TableRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'sticky-note':
      return <StickyNoteRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'document':
      return <DocumentRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    case 'connection':
      return <ConnectionRenderer element={element} />;

    case 'case':
    case 'party':
    case 'evidence':
    case 'claim':
    case 'law':
    case 'timeline':
    case 'person':
      return <LegalNodeRenderer element={element} style={commonStyle} onClick={handleClick} onMouseDown={handleMouseDown} />;

    default:
      return null;
  }
};

// ==================== Frame渲染器 ====================

const FrameRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'frame' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div
      style={{
        ...style,
        backgroundColor: element.backgroundColor,
        border: `${element.borderWidth}px solid ${element.borderColor}`,
        borderRadius: element.borderRadius,
        padding: `${element.padding?.top}px ${element.padding?.right}px ${element.padding?.bottom}px ${element.padding?.left}px`,
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#6b7280' }}>
        {element.name}
      </div>
      {/* 子元素将由父组件渲染 */}
    </div>
  );
};

// ==================== Group渲染器 ====================

const GroupRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'group' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div
      style={{
        ...style,
        border: '1px dashed #9ca3af',
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div style={{ fontSize: 10, color: '#9ca3af' }}>
        {element.name}
      </div>
    </div>
  );
};

// ==================== Text渲染器 ====================

const TextRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'text' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div
      style={{
        ...style,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        textAlign: element.textAlign,
        textDecoration: element.textDecoration,
        color: element.color,
        backgroundColor: element.backgroundColor,
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing,
        maxWidth: element.maxWidth,
        overflow: 'hidden',
        padding: '8px',
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {element.content}
    </div>
  );
};

// ==================== Image渲染器 ====================

const ImageRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'image' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div style={style} onClick={onClick} onMouseDown={onMouseDown}>
      <img
        src={element.src}
        alt={element.alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: element.fit,
          borderRadius: element.borderRadius,
          filter: element.filters
            ? `brightness(${element.filters.brightness ?? 1}) contrast(${element.filters.contrast ?? 1}) saturate(${element.filters.saturate ?? 1}) blur(${element.filters.blur ?? 0}px) grayscale(${element.filters.grayscale ?? 0})`
            : undefined,
        }}
      />
    </div>
  );
};

// ==================== Shape渲染器 ====================

const ShapeRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'shape' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  const renderShape = () => {
    switch (element.shapeType) {
      case 'rectangle':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: element.fillColor,
              border: `${element.strokeWidth}px solid ${element.strokeColor}`,
              borderRadius: element.cornerRadius,
            }}
          />
        );

      case 'circle':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: element.fillColor,
              border: `${element.strokeWidth}px solid ${element.strokeColor}`,
              borderRadius: '50%',
            }}
          />
        );

      default:
        return <div>Shape: {element.shapeType}</div>;
    }
  };

  return (
    <div style={style} onClick={onClick} onMouseDown={onMouseDown}>
      {renderShape()}
    </div>
  );
};

// ==================== Table渲染器 ====================

const TableRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'table' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div style={style} onClick={onClick} onMouseDown={onMouseDown}>
      <table
        style={{
          width: '100%',
          height: '100%',
          borderCollapse: 'collapse',
          border: `${element.borderWidth}px solid ${element.borderColor}`,
        }}
      >
        <tbody>
          {element.cells.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={{
                backgroundColor:
                  element.alternateRowColor && rowIndex % 2 === 1
                    ? '#f9fafb'
                    : 'transparent',
              }}
            >
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    border: `${element.borderWidth}px solid ${element.borderColor}`,
                    padding: element.cellPadding,
                    textAlign: cell.textAlign,
                    verticalAlign: cell.verticalAlign,
                    backgroundColor: cell.backgroundColor,
                  }}
                >
                  {cell.content}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== Sticky Note渲染器 ====================

const StickyNoteRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'sticky-note' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  const colorMap = {
    yellow: '#fef3c7',
    pink: '#fce7f3',
    blue: '#dbeafe',
    green: '#d1fae5',
    purple: '#e9d5ff',
    orange: '#fed7aa',
  };

  return (
    <div
      style={{
        ...style,
        backgroundColor: colorMap[element.color || 'yellow'],
        padding: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        fontSize: element.fontSize,
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {element.content}
    </div>
  );
};

// ==================== Document渲染器 ====================

const DocumentRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'document' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div
      style={{
        ...style,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
        {element.name}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        {element.documentType.toUpperCase()}
      </div>
      {element.totalPages && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          第 {element.pageNumber} / {element.totalPages} 页
        </div>
      )}
    </div>
  );
};

// ==================== Connection渲染器 ====================

const ConnectionRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'connection' }>;
}> = () => {
  // 连接线需要特殊处理，这里简化实现
  return null;
};

// ==================== Legal Node渲染器 ====================

const LegalNodeRenderer: React.FC<{
  element: Extract<CanvasElement, { type: 'case' | 'party' | 'evidence' | 'claim' | 'law' | 'timeline' | 'person' }>;
  style: React.CSSProperties;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, style, onClick, onMouseDown }) => {
  return (
    <div
      style={{
        ...style,
        background: `linear-gradient(135deg, ${element.gradient?.from}, ${element.gradient?.to})`,
        borderRadius: 12,
        padding: 16,
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{element.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
        {element.label}
      </div>
      {element.description && (
        <div style={{ fontSize: 12, marginTop: 4, textAlign: 'center', opacity: 0.9 }}>
          {element.description}
        </div>
      )}
    </div>
  );
};

