/**
 * LegalMind法律工作台 - 工具函数
 * 
 * 本文件包含工作台组件使用的工具函数
 */

import { LegalNode, CaseInfoMetadata, PersonMetadata } from './types';

/**
 * 创建演示节点数据
 * 
 * 用于开发和测试，创建一个包含3个节点的演示案件
 * 
 * @returns 演示节点数组
 */
export const createDemoNodes = (): LegalNode[] => [
  {
    id: 'case-001',
    type: 'legal-case',
    data: {
      title: '商事仲裁案件 2024-001',
      description: '关于合同纠纷的仲裁案件，涉及货物交付延迟问题',
      status: 'active',
      metadata: {
        caseNumber: 'ARB-2024-001',
        caseType: '合同纠纷',
        amount: 500000,
        filingDate: '2024-01-15'
      } as CaseInfoMetadata,
      position: { x: 600, y: 250 },  // 中心位置，形成专业布局
      connections: ['person-001', 'person-002']
    },
    children: []
  },
  {
    id: 'person-001',
    type: 'legal-person',
    data: {
      title: '申请人：张三公司',
      description: '北京张三贸易有限公司，申请人',
      status: 'active',
      metadata: {
        role: '申请人',
        company: '北京张三贸易有限公司',
        representative: '张三'
      } as PersonMetadata,
      position: { x: 300, y: 450 },  // 左下方，形成倒三角布局
      connections: ['case-001']
    },
    children: []
  },
  {
    id: 'person-002',
    type: 'legal-person',
    data: {
      title: '被申请人：李四集团',
      description: '上海李四实业集团，被申请人',
      status: 'active',
      metadata: {
        role: '被申请人',
        company: '上海李四实业集团',
        representative: '李四'
      } as PersonMetadata,
      position: { x: 900, y: 450 },  // 右下方，形成倒三角布局
      connections: ['case-001']
    },
    children: []
  }
];

/**
 * 生成唯一ID
 * 
 * @param prefix ID前缀
 * @returns 唯一ID字符串
 */
export const generateId = (prefix: string = 'node'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 查找空白位置
 * 
 * 在画布上查找一个没有节点的空白位置
 * 
 * @param nodes 现有节点列表
 * @param preferredX 首选X坐标
 * @param preferredY 首选Y坐标
 * @returns 空白位置坐标
 */
export const findEmptyPosition = (
  nodes: LegalNode[],
  preferredX: number = 400,
  preferredY: number = 300
): { x: number; y: number } => {
  const nodeSize = 200; // 节点大小
  const spacing = 50;   // 节点间距
  
  // 检查首选位置是否可用
  const isPositionOccupied = (x: number, y: number): boolean => {
    return nodes.some(node => {
      const dx = Math.abs(node.data.position.x - x);
      const dy = Math.abs(node.data.position.y - y);
      return dx < nodeSize + spacing && dy < nodeSize + spacing;
    });
  };
  
  // 如果首选位置可用，直接返回
  if (!isPositionOccupied(preferredX, preferredY)) {
    return { x: preferredX, y: preferredY };
  }
  
  // 螺旋搜索空白位置
  let radius = nodeSize + spacing;
  let angle = 0;
  const angleStep = Math.PI / 4; // 45度
  const radiusStep = nodeSize + spacing;
  
  for (let i = 0; i < 100; i++) {
    const x = preferredX + radius * Math.cos(angle);
    const y = preferredY + radius * Math.sin(angle);
    
    if (!isPositionOccupied(x, y)) {
      return { x, y };
    }
    
    angle += angleStep;
    if (angle >= 2 * Math.PI) {
      angle = 0;
      radius += radiusStep;
    }
  }
  
  // 如果找不到空白位置，返回一个随机位置
  return {
    x: preferredX + Math.random() * 400 - 200,
    y: preferredY + Math.random() * 400 - 200
  };
};

/**
 * 计算节点的边界框
 * 
 * @param nodes 节点列表
 * @returns 边界框 { minX, minY, maxX, maxY }
 */
export const calculateBoundingBox = (nodes: LegalNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} => {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }
  
  const nodeSize = 200;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  nodes.forEach(node => {
    const { x, y } = node.data.position;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + nodeSize);
    maxY = Math.max(maxY, y + nodeSize);
  });
  
  return { minX, minY, maxX, maxY };
};

/**
 * 自动布局节点
 * 
 * 将节点按照圆形布局排列
 * 
 * @param nodes 节点列表
 * @param centerX 中心X坐标
 * @param centerY 中心Y坐标
 * @param radius 半径
 * @returns 布局后的节点列表
 */
export const autoLayoutNodes = (
  nodes: LegalNode[],
  centerX: number = 400,
  centerY: number = 300,
  radius: number = 200
): LegalNode[] => {
  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    return {
      ...node,
      data: {
        ...node.data,
        position: { x, y }
      }
    };
  });
};

