/**
 * Command模式实现
 * 
 * 用于封装所有可撤销的操作，支持撤销/重做功能
 * 
 * 功能：
 * - 命令接口定义
 * - 常用命令实现（创建、删除、更新、移动节点等）
 * - 批量命令支持
 * - 命令历史管理
 * 
 * @author AI Agent
 * @date 2025-11-06
 */

import { produce } from 'immer';
import type { LegalNode, Connection } from '../components/workspace/types';

/**
 * 命令接口
 */
export interface Command<T = any> {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description?: string;
  /** 执行命令 */
  execute(state: T): T;
  /** 撤销命令 */
  undo(state: T): T;
  /** 重做命令（默认调用execute） */
  redo?(state: T): T;
  /** 命令元数据 */
  metadata?: Record<string, any>;
}

/**
 * 工作台状态类型
 */
export interface WorkspaceCommandState {
  nodes: LegalNode[];
  connections: Connection[];
}

/**
 * 创建节点命令
 */
export class CreateNodeCommand implements Command<WorkspaceCommandState> {
  name = 'CreateNode';
  description: string;
  private node: LegalNode;

  constructor(node: LegalNode, description?: string) {
    this.node = node;
    this.description = description || `创建节点: ${node.data.title}`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      draft.nodes.push(this.node);
    });
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const index = draft.nodes.findIndex(n => n.id === this.node.id);
      if (index !== -1) {
        draft.nodes.splice(index, 1);
      }
    });
  }
}

/**
 * 删除节点命令
 */
export class DeleteNodeCommand implements Command<WorkspaceCommandState> {
  name = 'DeleteNode';
  description: string;
  private nodeId: string;
  private deletedNode: LegalNode | null = null;
  private deletedConnections: Connection[] = [];

  constructor(nodeId: string, description?: string) {
    this.nodeId = nodeId;
    this.description = description || `删除节点: ${nodeId}`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      // {{ AURA: Fix - 保存被删除的节点（深拷贝，避免Immer draft对象被revoke） }}
      const index = draft.nodes.findIndex(n => n.id === this.nodeId);
      if (index !== -1) {
        this.deletedNode = JSON.parse(JSON.stringify(draft.nodes[index]));
        draft.nodes.splice(index, 1);
      }

      // {{ AURA: Fix - 保存并删除相关连接（深拷贝） }}
      this.deletedConnections = JSON.parse(JSON.stringify(
        draft.connections.filter(
          c => c.source === this.nodeId || c.target === this.nodeId
        )
      ));
      draft.connections = draft.connections.filter(
        c => c.source !== this.nodeId && c.target !== this.nodeId
      );
    });
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      // 恢复节点
      if (this.deletedNode) {
        draft.nodes.push(this.deletedNode);
      }
      // 恢复连接
      draft.connections.push(...this.deletedConnections);
    });
  }
}

/**
 * 更新节点命令
 */
export class UpdateNodeCommand implements Command<WorkspaceCommandState> {
  name = 'UpdateNode';
  description: string;
  private nodeId: string;
  private updates: Partial<LegalNode>;
  private previousState: Partial<LegalNode> | null = null;

  constructor(nodeId: string, updates: Partial<LegalNode>, description?: string) {
    this.nodeId = nodeId;
    this.updates = updates;
    this.description = description || `更新节点: ${nodeId}`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const node = draft.nodes.find(n => n.id === this.nodeId);
      if (node) {
        // {{ AURA: Fix - 保存之前的状态（深拷贝） }}
        this.previousState = JSON.parse(JSON.stringify(node));
        // 应用更新
        Object.assign(node, this.updates);
      }
    });
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const node = draft.nodes.find(n => n.id === this.nodeId);
      if (node && this.previousState) {
        Object.assign(node, this.previousState);
      }
    });
  }
}

/**
 * 移动节点命令
 */
export class MoveNodeCommand implements Command<WorkspaceCommandState> {
  name = 'MoveNode';
  description: string;
  private nodeId: string;
  private newPosition: { x: number; y: number };
  private previousPosition: { x: number; y: number } | null = null;

  constructor(nodeId: string, newPosition: { x: number; y: number }, description?: string) {
    this.nodeId = nodeId;
    this.newPosition = newPosition;
    this.description = description || `移动节点: ${nodeId}`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const node = draft.nodes.find(n => n.id === this.nodeId);
      if (node && node.data.position) {
        this.previousPosition = { ...node.data.position };
        node.data.position = this.newPosition;
      }
    });
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const node = draft.nodes.find(n => n.id === this.nodeId);
      if (node && this.previousPosition) {
        node.data.position = this.previousPosition;
      }
    });
  }
}

/**
 * 创建连接命令
 */
export class CreateConnectionCommand implements Command<WorkspaceCommandState> {
  name = 'CreateConnection';
  description: string;
  private connection: Connection;

  constructor(connection: Connection, description?: string) {
    this.connection = connection;
    this.description = description || `创建连接: ${connection.source} -> ${connection.target}`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      draft.connections.push(this.connection);
    });
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const index = draft.connections.findIndex(
        c => c.source === this.connection.source && c.target === this.connection.target
      );
      if (index !== -1) {
        draft.connections.splice(index, 1);
      }
    });
  }
}

/**
 * 删除连接命令
 */
export class DeleteConnectionCommand implements Command<WorkspaceCommandState> {
  name = 'DeleteConnection';
  description: string;
  private source: string;
  private target: string;
  private deletedConnection: Connection | null = null;

  constructor(source: string, target: string, description?: string) {
    this.source = source;
    this.target = target;
    this.description = description || `删除连接: ${source} -> ${target}`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      const index = draft.connections.findIndex(
        c => c.source === this.source && c.target === this.target
      );
      if (index !== -1) {
        // {{ AURA: Fix - 深拷贝被删除的连接 }}
        this.deletedConnection = JSON.parse(JSON.stringify(draft.connections[index]));
        draft.connections.splice(index, 1);
      }
    });
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    return produce(state, (draft) => {
      if (this.deletedConnection) {
        draft.connections.push(this.deletedConnection);
      }
    });
  }
}

/**
 * 批量命令（组合多个命令）
 */
export class BatchCommand implements Command<WorkspaceCommandState> {
  name = 'BatchCommand';
  description: string;
  private commands: Command<WorkspaceCommandState>[];

  constructor(commands: Command<WorkspaceCommandState>[], description?: string) {
    this.commands = commands;
    this.description = description || `批量操作 (${commands.length}个命令)`;
  }

  execute(state: WorkspaceCommandState): WorkspaceCommandState {
    let newState = state;
    for (const command of this.commands) {
      newState = command.execute(newState);
    }
    return newState;
  }

  undo(state: WorkspaceCommandState): WorkspaceCommandState {
    let newState = state;
    // 反向撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      newState = this.commands[i].undo(newState);
    }
    return newState;
  }
}

/**
 * 命令历史管理器
 */
export class CommandHistory<T = any> {
  private history: Command<T>[] = [];
  private currentIndex: number = -1;
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * 执行命令并添加到历史记录
   */
  execute(command: Command<T>, state: T): T {
    // 移除当前位置之后的所有历史记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 执行命令
    const newState = command.execute(state);

    // 添加到历史记录
    this.history.push(command);

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    return newState;
  }

  /**
   * 撤销
   */
  undo(state: T): T | null {
    if (!this.canUndo()) return null;

    const command = this.history[this.currentIndex];
    this.currentIndex--;
    return command.undo(state);
  }

  /**
   * 重做
   */
  redo(state: T): T | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    return command.redo ? command.redo(state) : command.execute(state);
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取历史记录
   */
  getHistory(): Command<T>[] {
    return [...this.history];
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

