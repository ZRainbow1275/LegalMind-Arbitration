import { PlaitBoard, PlaitElement, Point } from '@plait/core';
import { LegalNode, LegalNodeTypes } from './types';
import { LegalNodeEngine } from './engines/legal-node-engine';

// 扩展PlaitBoard接口以支持法律节点功能
export interface LegalBoard extends PlaitBoard {
  createLegalNode: (nodeType: LegalNodeTypes, position: Point) => LegalNode;
  getLegalNodes: () => LegalNode[];
  updateLegalNode: (nodeId: string, updates: Partial<LegalNode>) => void;
  deleteLegalNode: (nodeId: string) => void;
  findLegalNodeById: (nodeId: string) => LegalNode | undefined;
  isLegalNode: (element: PlaitElement) => element is LegalNode;
}

// 法律节点插件
export const withLegalNodes = (board: PlaitBoard): LegalBoard => {
  const legalBoard = board as LegalBoard;

  // 创建法律节点
  legalBoard.createLegalNode = (nodeType: LegalNodeTypes, position: Point): LegalNode => {
    const node = LegalNodeEngine.createNode(nodeType, position, board);

    // 添加到画板
    const newChildren = [...board.children, node];
    board.children = newChildren;

    return node;
  };

  // 获取所有法律节点
  legalBoard.getLegalNodes = (): LegalNode[] => {
    return board.children.filter(element =>
      LegalNodeEngine.isLegalNode(element)
    ) as LegalNode[];
  };

  // 更新法律节点
  legalBoard.updateLegalNode = (nodeId: string, updates: Partial<LegalNode>): void => {
    const nodeIndex = board.children.findIndex(element => element.id === nodeId);
    if (nodeIndex !== -1) {
      const currentNode = board.children[nodeIndex] as LegalNode;
      const updatedNode = { ...currentNode, ...updates };

      const newChildren = [...board.children];
      newChildren[nodeIndex] = updatedNode;
      board.children = newChildren;
    }
  };

  // 删除法律节点
  legalBoard.deleteLegalNode = (nodeId: string): void => {
    const newChildren = board.children.filter(element => element.id !== nodeId);
    board.children = newChildren;
  };

  // 根据ID查找法律节点
  legalBoard.findLegalNodeById = (nodeId: string): LegalNode | undefined => {
    const element = board.children.find(element => element.id === nodeId);
    return LegalNodeEngine.isLegalNode(element) ? element : undefined;
  };

  // 判断是否为法律节点
  legalBoard.isLegalNode = (element: PlaitElement): element is LegalNode => {
    return LegalNodeEngine.isLegalNode(element);
  };

  // 扩展原有的事件处理
  /*
  const originalOnPointerDown = board.onPointerDown;
  board.onPointerDown = (event: PointerEvent) => {
    // 处理法律节点的点击事件
    const point: Point = [event.clientX, event.clientY];
    const hitNode = legalBoard.getLegalNodes().find(node => {
      const bounds = LegalNodeEngine.getNodeBounds(node);
      return point[0] >= bounds.x && point[0] <= bounds.x + bounds.width &&
        point[1] >= bounds.y && point[1] <= bounds.y + bounds.height;
    });

    if (hitNode) {
      // 选中法律节点
      console.log('Legal node clicked:', hitNode);
      // 这里可以添加选中状态的处理逻辑
    }

    // 调用原有的处理逻辑
    if (originalOnPointerDown) {
      originalOnPointerDown.call(board, event);
    }
  };

  const originalOnDoubleClick = board.onDoubleClick;
  board.onDoubleClick = (event: MouseEvent) => {
    // 处理法律节点的双击事件
    const point: Point = [event.clientX, event.clientY];
    const hitNode = legalBoard.getLegalNodes().find(node => {
      const bounds = LegalNodeEngine.getNodeBounds(node);
      return point[0] >= bounds.x && point[0] <= bounds.x + bounds.width &&
        point[1] >= bounds.y && point[1] <= bounds.y + bounds.height;
    });

    if (hitNode) {
      // ...
    }
  };
  */
  /*
  // 打开编辑对话框
  console.log('Legal node double-clicked for editing:', hitNode);
  // 这里可以触发编辑对话框
  return; // 阻止默认行为
}

// 调用原有的处理逻辑
if (originalOnDoubleClick) {
  originalOnDoubleClick.call(board, event);
}
  };
  */

  // 扩展键盘事件处理
  const originalOnKeyDown = (board as any).onKeyDown;
  (board as any).onKeyDown = (event: KeyboardEvent) => {
    // 处理法律节点相关的快捷键
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1': {
          // Ctrl+1: 创建案件节点
          event.preventDefault();
          const casePosition: Point = [100, 100]; // 默认位置
          legalBoard.createLegalNode(LegalNodeTypes.case, casePosition);
          return;
        }

        case '2': {
          // Ctrl+2: 创建人物节点
          event.preventDefault();
          const personPosition: Point = [200, 100];
          legalBoard.createLegalNode(LegalNodeTypes.person, personPosition);
          return;
        }

        case '3': {
          // Ctrl+3: 创建文档节点
          event.preventDefault();
          const docPosition: Point = [300, 100];
          legalBoard.createLegalNode(LegalNodeTypes.document, docPosition);
          return;
        }

        case '4': {
          // Ctrl+4: 创建时间轴节点
          event.preventDefault();
          const timelinePosition: Point = [400, 100];
          legalBoard.createLegalNode(LegalNodeTypes.timeline, timelinePosition);
          return;
        }

        case '5': {
          // Ctrl+5: 创建流程节点
          event.preventDefault();
          const processPosition: Point = [500, 100];
          legalBoard.createLegalNode(LegalNodeTypes.process, processPosition);
          return;
        }

        case '6': {
          // Ctrl+6: 创建AI助手节点
          event.preventDefault();
          const aiPosition: Point = [600, 100];
          legalBoard.createLegalNode(LegalNodeTypes.aiAssistant, aiPosition);
          return;
        }
      }
    }

    // Delete键删除选中的法律节点
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // 这里需要获取当前选中的节点
      // 暂时跳过，等待选择系统完善
    }

    // 调用原有的处理逻辑
    if (originalOnKeyDown) {
      originalOnKeyDown.call(board, event);
    }
  };

  // 添加法律节点的渲染支持
  const originalRenderElement = (board as any).renderElement;
  (board as any).renderElement = (element: PlaitElement) => {
    if (LegalNodeEngine.isLegalNode(element)) {
      // 返回法律节点的渲染组件
      // 注意：这里需要与React组件系统集成
      return null; // 暂时返回null，实际渲染在React组件中处理
    }

    // 调用原有的渲染逻辑
    if (originalRenderElement) {
      return originalRenderElement.call(board, element);
    }

    return null;
  };

  // 添加法律节点的序列化支持
  const originalSerialize = (board as any).serialize;
  (board as any).serialize = () => {
    const data = originalSerialize ? originalSerialize.call(board) : board.children;

    // 确保法律节点数据完整性
    return data.map((element: any) => {
      if (LegalNodeEngine.isLegalNode(element)) {
        // 添加法律节点特有的序列化逻辑
        return {
          ...element,
          __legalNodeVersion: '1.0',
          __serializedAt: new Date().toISOString()
        };
      }
      return element;
    });
  };

  // 添加法律节点的反序列化支持
  const originalDeserialize = (board as any).deserialize;
  (board as any).deserialize = (data: any[]) => {
    const elements = data.map(item => {
      if (item.__legalNodeVersion) {
        // 处理法律节点的反序列化
        const { __legalNodeVersion, __serializedAt, ...element } = item;


        return element as PlaitElement;
      }
      return item as PlaitElement;
    });

    if (originalDeserialize) {
      return originalDeserialize.call(board, elements);
    }

    return elements;
  };

  return legalBoard;
};

// 工具函数：检查是否为法律画板
export const isLegalBoard = (board: PlaitBoard): board is LegalBoard => {
  return 'createLegalNode' in board &&
    'getLegalNodes' in board &&
    'updateLegalNode' in board;
};

// 工具函数：获取法律画板实例
export const getLegalBoard = (board: PlaitBoard): LegalBoard => {
  if (isLegalBoard(board)) {
    return board;
  }
  throw new Error('Board is not a LegalBoard. Make sure to apply withLegalNodes plugin.');
};
