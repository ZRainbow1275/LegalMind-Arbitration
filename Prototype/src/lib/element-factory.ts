/**
 * 元素工厂
 * 
 * 负责创建各种类型的画布元素
 */

import type {
  Position,
  Size,
  FrameElement,
  GroupElement,
  TextElement,
  ImageElement,
  ShapeElement,
  TableElement,
  StickyNoteElement,
  DocumentElement,
  ConnectionElement,
  LegalNodeElement,
  ShapeType,
  TableCell,
} from '../types/canvas-elements';

// ==================== 辅助函数 ====================

function generateId(prefix: string = 'el'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ==================== Frame ====================

export function createFrame(
  position: Position,
  size: Size,
  name: string = '新框架'
): FrameElement {
  return {
    id: generateId('frame'),
    type: 'frame',
    name,
    position,
    size,
    children: [],
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: {
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    },
    layout: {
      type: 'none',
    },
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
}

// ==================== Group ====================

export function createGroup(
  elementIds: string[],
  name: string = '新组'
): GroupElement {
  // 计算组的位置和大小（基于子元素）
  // 这里简化处理，实际应该计算所有子元素的包围盒
  return {
    id: generateId('group'),
    type: 'group',
    name,
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    children: elementIds,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };
}

// ==================== Text ====================

export function createText(
  position: Position,
  content: string = '文本内容',
  options?: Partial<TextElement>
): TextElement {
  return {
    id: generateId('text'),
    type: 'text',
    position,
    size: { width: 200, height: 40 },
    content,
    fontSize: 16,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    textDecoration: 'none',
    color: '#1f2937',
    lineHeight: 1.5,
    autoResize: true,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Image ====================

export function createImage(
  position: Position,
  src: string,
  options?: Partial<ImageElement>
): ImageElement {
  return {
    id: generateId('image'),
    type: 'image',
    position,
    size: { width: 300, height: 200 },
    src,
    alt: '图片',
    fit: 'cover',
    borderRadius: 8,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Shape ====================

export function createShape(
  position: Position,
  shapeType: ShapeType,
  options?: Partial<ShapeElement>
): ShapeElement {
  const defaultSize: Record<ShapeType, Size> = {
    rectangle: { width: 200, height: 100 },
    circle: { width: 100, height: 100 },
    triangle: { width: 100, height: 100 },
    arrow: { width: 150, height: 50 },
    line: { width: 200, height: 2 },
    polygon: { width: 100, height: 100 },
  };

  return {
    id: generateId('shape'),
    type: 'shape',
    shapeType,
    position,
    size: defaultSize[shapeType],
    fillColor: '#f3f4f6',
    strokeColor: '#6b7280',
    strokeWidth: 2,
    cornerRadius: shapeType === 'rectangle' ? 8 : 0,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Table ====================

export function createTable(
  position: Position,
  rows: number = 3,
  cols: number = 3,
  options?: Partial<TableElement>
): TableElement {
  // 创建空单元格
  const cells: TableCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      content: '',
      textAlign: 'left' as const,
      verticalAlign: 'middle' as const,
    }))
  );

  return {
    id: generateId('table'),
    type: 'table',
    position,
    size: { width: cols * 120, height: rows * 40 },
    rows,
    cols,
    cells,
    headerRow: true,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    cellPadding: 8,
    alternateRowColor: true,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Sticky Note ====================

export function createStickyNote(
  position: Position,
  content: string = '',
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange' = 'yellow',
  options?: Partial<StickyNoteElement>
): StickyNoteElement {
  return {
    id: generateId('sticky'),
    type: 'sticky-note',
    position,
    size: { width: 200, height: 200 },
    content,
    color,
    fontSize: 14,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Document ====================

export function createDocument(
  position: Position,
  src: string,
  documentType: 'pdf' | 'word' | 'excel' | 'ppt',
  name: string = '文档',
  options?: Partial<DocumentElement>
): DocumentElement {
  return {
    id: generateId('doc'),
    type: 'document',
    position,
    size: { width: 400, height: 500 },
    documentType,
    src,
    name,
    pageNumber: 1,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Connection ====================

export function createConnection(
  sourceId: string,
  targetId: string,
  options?: Partial<ConnectionElement>
): ConnectionElement {
  return {
    id: generateId('conn'),
    type: 'connection',
    position: { x: 0, y: 0 }, // 连接线的位置由源和目标决定
    size: { width: 0, height: 0 },
    sourceId,
    targetId,
    sourceAnchor: 'center',
    targetAnchor: 'center',
    lineType: 'bezier',
    strokeColor: '#f97316',
    strokeWidth: 2,
    arrowEnd: true,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: -1, // 连接线默认在最底层
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== Legal Node ====================

export function createLegalNode(
  position: Position,
  type: 'case' | 'party' | 'evidence' | 'claim' | 'law' | 'timeline' | 'person',
  label: string,
  options?: Partial<LegalNodeElement>
): LegalNodeElement {
  const nodeConfig: Record<string, { icon: string; gradient: { from: string; to: string } }> = {
    case: { icon: '⚖️', gradient: { from: '#a855f7', to: '#ec4899' } },
    party: { icon: '👤', gradient: { from: '#ec4899', to: '#f43f5e' } },
    evidence: { icon: '📄', gradient: { from: '#3b82f6', to: '#06b6d4' } },
    claim: { icon: '💰', gradient: { from: '#10b981', to: '#14b8a6' } },
    law: { icon: '📖', gradient: { from: '#f97316', to: '#f59e0b' } },
    timeline: { icon: '⏱️', gradient: { from: '#06b6d4', to: '#0ea5e9' } },
    person: { icon: '👨', gradient: { from: '#e5e7eb', to: '#d1d5db' } },
  };

  const config = nodeConfig[type];

  return {
    id: generateId('node'),
    type,
    position,
    size: { width: 180, height: 120 },
    label,
    icon: config.icon,
    gradient: config.gradient,
    visible: true,
    locked: false,
    opacity: 1,
    zIndex: 0,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    ...options,
  };
}

// ==================== 导出工厂对象 ====================

export const ElementFactory = {
  createFrame,
  createGroup,
  createText,
  createImage,
  createShape,
  createTable,
  createStickyNote,
  createDocument,
  createConnection,
  createLegalNode,
};

