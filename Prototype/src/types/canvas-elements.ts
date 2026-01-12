/**
 * 画布元素类型定义
 * 
 * 多层级结构：
 * - Frame（框架）：可以包含其他元素的容器
 * - Group（组）：将多个元素组合在一起
 * - Element（元素）：基础元素（节点、连接、文本、图片等）
 */

// ==================== 基础类型 ====================

export type ElementType =
  // 容器类型
  | 'frame'
  | 'group'
  // 法律节点类型（已有）
  | 'case'
  | 'party'
  | 'evidence'
  | 'claim'
  | 'law'
  | 'timeline'
  | 'person'
  // 新增内容类型
  | 'text'
  | 'image'
  | 'shape'
  | 'table'
  | 'sticky-note'
  | 'document'
  | 'connection';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line' | 'polygon';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ==================== 基础元素接口 ====================

export interface BaseElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  rotation?: number; // 旋转角度（度）
  opacity?: number; // 透明度 0-1
  locked?: boolean; // 是否锁定
  visible?: boolean; // 是否可见
  zIndex?: number; // 层级
  parentId?: string; // 父元素ID
  metadata?: Record<string, any>; // 元数据
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ==================== Frame（框架）====================

export interface FrameElement extends BaseElement {
  type: 'frame';
  name: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  children: string[]; // 子元素ID列表
  layout?: {
    type: 'none' | 'horizontal' | 'vertical' | 'grid';
    gap?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  };
}

// ==================== Group（组）====================

export interface GroupElement extends BaseElement {
  type: 'group';
  name: string;
  children: string[]; // 子元素ID列表
}

// ==================== 文本元素 ====================

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  backgroundColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  maxWidth?: number;
  autoResize?: boolean; // 自动调整大小
}

// ==================== 图片元素 ====================

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // 图片URL或base64
  alt?: string;
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  borderRadius?: number;
  filters?: {
    brightness?: number; // 0-2
    contrast?: number; // 0-2
    saturate?: number; // 0-2
    blur?: number; // 0-10
    grayscale?: number; // 0-1
  };
}

// ==================== 形状元素 ====================

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: number[]; // 虚线样式
  cornerRadius?: number; // 圆角（矩形）
  points?: Position[]; // 多边形的点
}

// ==================== 表格元素 ====================

export interface TableCell {
  content: string;
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

export interface TableElement extends BaseElement {
  type: 'table';
  rows: number;
  cols: number;
  cells: TableCell[][];
  headerRow?: boolean; // 是否有表头行
  borderColor?: string;
  borderWidth?: number;
  cellPadding?: number;
  alternateRowColor?: boolean; // 是否交替行颜色
}

// ==================== 便签元素 ====================

export interface StickyNoteElement extends BaseElement {
  type: 'sticky-note';
  content: string;
  color?: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';
  fontSize?: number;
}

// ==================== 文档元素 ====================

export interface DocumentElement extends BaseElement {
  type: 'document';
  documentType: 'pdf' | 'word' | 'excel' | 'ppt';
  src: string; // 文档URL
  name: string;
  pageNumber?: number; // 当前显示的页码
  totalPages?: number;
  thumbnail?: string; // 缩略图URL
}

// ==================== 连接线元素 ====================

export interface ConnectionElement extends BaseElement {
  type: 'connection';
  sourceId: string;
  targetId: string;
  sourceAnchor?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  targetAnchor?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  lineType?: 'straight' | 'bezier' | 'orthogonal';
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  arrowStart?: boolean;
  arrowEnd?: boolean;
  label?: string;
  labelPosition?: number; // 0-1，标签在连接线上的位置
  // 语义化属性（法律关系）
  relationshipType?: 'supports' | 'opposes' | 'causes' | 'temporal' | 'references' | 'belongs_to';
  strength?: number; // 关系强度 0-1
  confidence?: number; // 置信度 0-1
}

// ==================== 法律节点元素（扩展）====================

export interface LegalNodeElement extends BaseElement {
  type: 'case' | 'party' | 'evidence' | 'claim' | 'law' | 'timeline' | 'person';
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  gradient?: {
    from: string;
    to: string;
  };
  // 业务属性（根据type不同而不同）
  businessData?: Record<string, any>;
  // 兼容旧代码的data属性
  data?: {
    layout: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    [key: string]: any;
  };
}

// ==================== 联合类型 ====================

export type CanvasElement =
  | FrameElement
  | GroupElement
  | TextElement
  | ImageElement
  | ShapeElement
  | TableElement
  | StickyNoteElement
  | DocumentElement
  | ConnectionElement
  | LegalNodeElement;

// ==================== 画布数据结构 ====================

export interface CanvasData {
  id: string;
  name: string;
  elements: Record<string, CanvasElement>; // 元素ID -> 元素
  rootElements: string[]; // 根元素ID列表（没有parentId的元素）
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  background?: {
    color?: string;
    image?: string;
    grid?: {
      enabled: boolean;
      size: number;
      color: string;
    };
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    version?: string;
    tags?: string[];
  };
}

// ==================== 工具函数类型 ====================

export interface ElementFactory {
  createFrame(position: Position, size: Size, name: string): FrameElement;
  createGroup(elementIds: string[], name: string): GroupElement;
  createText(position: Position, content: string): TextElement;
  createImage(position: Position, src: string): ImageElement;
  createShape(position: Position, shapeType: ShapeType): ShapeElement;
  createTable(position: Position, rows: number, cols: number): TableElement;
  createStickyNote(position: Position, content: string, color?: string): StickyNoteElement;
  createDocument(position: Position, src: string, documentType: string): DocumentElement;
  createConnection(sourceId: string, targetId: string): ConnectionElement;
  createLegalNode(position: Position, type: string, label: string): LegalNodeElement;
}

// ==================== 选择和操作 ====================

export interface Selection {
  elementIds: string[];
  bounds?: Bounds; // 选中元素的包围盒
}

export interface Operation {
  type: 'create' | 'update' | 'delete' | 'move' | 'resize' | 'rotate' | 'group' | 'ungroup';
  elementIds: string[];
  before?: Partial<CanvasElement>[];
  after?: Partial<CanvasElement>[];
  timestamp: number;
  userId?: string;
}

// ==================== 对齐和分布 ====================

export type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeType = 'horizontal' | 'vertical';

