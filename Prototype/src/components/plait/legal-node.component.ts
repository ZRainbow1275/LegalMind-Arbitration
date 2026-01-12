/**
 * 法律节点Component类
 * 
 * 这个文件定义了法律节点的渲染逻辑
 * 继承自Plait的GeometryComponent
 */

import { PlaitBoard, OnContextChanged } from '@plait/core';
import { GeometryComponent } from '@plait/draw';
import { LegalNode, LegalNodeShapes, isLegalNode } from '../../interfaces/legal-elements';

/**
 * 法律节点Component类
 * 负责渲染法律专用节点
 */
export class LegalNodeComponent extends GeometryComponent implements OnContextChanged<LegalNode, PlaitBoard> {
  constructor() {
    super();
  }

  /**
 * 初始化Generator
   * 这里我们复用GeometryComponent的Generator
   */
  initializeGenerator(): void {
    super.initializeGenerator();
  }

  /**
   * 初始化
   */
  initialize(): void {
    super.initialize();

    // 自定义初始化逻辑
    this.customizeNodeAppearance();
  }

  /**
   * 上下文变化时的回调
   */
  onContextChanged(
    value: any,
    previous: any
  ): void {
    super.onContextChanged(value, previous);

    // 当节点数据变化时，更新外观
    if (value.element !== previous.element) {
      this.customizeNodeAppearance();
    }
  }

  /**
   * 自定义节点外观
   * 根据节点类型设置不同的样式
   */
  private customizeNodeAppearance(): void {
    const element = this.element as unknown as LegalNode;

    // 根据节点类型设置颜色
    const colorMap = {
      [LegalNodeShapes.case]: {
        stroke: '#FF6B35',
        fill: '#FFF5F2',
      },
      [LegalNodeShapes.person]: {
        stroke: '#FF6B35',
        fill: '#FFF5F2',
      },
      [LegalNodeShapes.document]: {
        stroke: '#FF6B35',
        fill: '#FFF5F2',
      },
      [LegalNodeShapes.hearing]: {
        stroke: '#FF6B35',
        fill: '#FFF5F2',
      },
      [LegalNodeShapes.mediation]: {
        stroke: '#FF6B35',
        fill: '#FFF5F2',
      },
      [LegalNodeShapes.timeline]: {
        stroke: '#FF6B35',
        fill: '#FFF5F2',
      },
    };

    const colors = colorMap[element.shape];
    if (colors) {
      element.strokeColor = colors.stroke;
      element.fill = colors.fill;
    }

    // 根据状态设置透明度
    const statusOpacityMap = {
      'pending': 0.6,
      'active': 1.0,
      'completed': 0.8,
      'cancelled': 0.4,
    };

    element.opacity = statusOpacityMap[element.status] || 1.0;
  }

  /**
   * 销毁
   */
  destroy(): void {
    super.destroy();
  }
}

/**
 * 检查元素是否应该使用LegalNodeComponent渲染
 */
export function shouldUseLegalNodeComponent(element: any): boolean {
  return isLegalNode(element);
}

