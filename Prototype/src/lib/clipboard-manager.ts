/**
 * 剪贴板管理器
 * 
 * 管理节点的复制、剪切和粘贴操作
 * 支持多节点操作和位置偏移
 */

import type { LegalNode } from '../components/workspace/types';

/**
 * 剪贴板数据
 */
interface ClipboardData {
  nodes: LegalNode[];
  timestamp: number;
}

/**
 * 剪贴板管理器类
 */
class ClipboardManager {
  private clipboard: ClipboardData | null = null;
  private readonly PASTE_OFFSET = 20; // 粘贴偏移量（像素）

  /**
   * 复制节点到剪贴板
   */
  copy(nodes: LegalNode[]): void {
    if (nodes.length === 0) {
      console.warn('[ClipboardManager] 没有节点可复制');
      return;
    }

    this.clipboard = {
      nodes: JSON.parse(JSON.stringify(nodes)), // 深拷贝
      timestamp: Date.now(),
    };

    console.log(`[ClipboardManager] 已复制 ${nodes.length} 个节点`);
  }

  /**
   * 从剪贴板粘贴节点
   * 
   * @param offsetMultiplier 偏移倍数（用于多次粘贴）
   * @returns 新创建的节点
   */
  paste(offsetMultiplier: number = 1): LegalNode[] | null {
    if (!this.clipboard || this.clipboard.nodes.length === 0) {
      console.warn('[ClipboardManager] 剪贴板为空');
      return null;
    }

    const offset = this.PASTE_OFFSET * offsetMultiplier;

    // 创建新节点（偏移位置）
    const newNodes: LegalNode[] = this.clipboard.nodes.map(node => {
      const newId = this.generateNodeId(node.type);

      return {
        ...node,
        id: newId,
        data: {
          ...node.data,
          title: node.data.title + ' (副本)',
          position: {
            x: node.data.position.x + offset,
            y: node.data.position.y + offset,
          },
          // 清除连接关系（需要用户重新建立）
          connections: [],
        },
      };
    });

    console.log(`[ClipboardManager] 已粘贴 ${newNodes.length} 个节点`);
    return newNodes;
  }

  /**
   * 剪切节点到剪贴板
   * 
   * @param nodes 要剪切的节点
   * @returns 是否成功
   */
  cut(nodes: LegalNode[]): boolean {
    if (nodes.length === 0) {
      console.warn('[ClipboardManager] 没有节点可剪切');
      return false;
    }

    this.copy(nodes);
    console.log(`[ClipboardManager] 已剪切 ${nodes.length} 个节点`);
    return true;
  }

  /**
   * 检查剪贴板是否有数据
   */
  hasData(): boolean {
    return this.clipboard !== null && this.clipboard.nodes.length > 0;
  }

  /**
   * 获取剪贴板中的节点数量
   */
  getNodeCount(): number {
    return this.clipboard?.nodes.length || 0;
  }

  /**
   * 清空剪贴板
   */
  clear(): void {
    this.clipboard = null;
    console.log('[ClipboardManager] 剪贴板已清空');
  }

  /**
   * 生成新的节点ID
   */
  private generateNodeId(type: string): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
export const clipboardManager = new ClipboardManager();

// 导出类型
export type { ClipboardData };

