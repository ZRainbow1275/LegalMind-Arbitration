/**
 * Command模式测试
 * 
 * @author AI Agent
 * @date 2025-11-06
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CreateNodeCommand,
  DeleteNodeCommand,
  UpdateNodeCommand,
  MoveNodeCommand,
  CreateConnectionCommand,
  DeleteConnectionCommand,
  BatchCommand,
  CommandHistory,
  type WorkspaceCommandState,
} from '../command-pattern';
import type { LegalNode, Connection } from '../../components/workspace/types';

describe('Command Pattern', () => {
  let initialState: WorkspaceCommandState;
  let testNode: LegalNode;
  let testConnection: Connection;

  beforeEach(() => {
    testNode = {
      id: 'node-1',
      type: 'legal-person',
      data: {
        title: '测试节点',
        description: '测试描述',
        status: 'active',
        metadata: {},
        position: { x: 100, y: 100 },
        connections: [],
      },
    };

    testConnection = {
      id: 'conn-1',
      source: 'node-1',
      target: 'node-2',
      type: 'related-to',
      label: '关联',
    };

    initialState = {
      nodes: [],
      connections: [],
    };
  });

  describe('CreateNodeCommand', () => {
    it('应该创建节点', () => {
      const command = new CreateNodeCommand(testNode);
      const newState = command.execute(initialState);

      expect(newState.nodes).toHaveLength(1);
      expect(newState.nodes[0]).toEqual(testNode);
    });

    it('应该撤销创建节点', () => {
      const command = new CreateNodeCommand(testNode);
      const newState = command.execute(initialState);
      const undoState = command.undo(newState);

      expect(undoState.nodes).toHaveLength(0);
    });

    it('不应该修改原始状态（不可变性）', () => {
      const command = new CreateNodeCommand(testNode);
      const newState = command.execute(initialState);

      expect(initialState.nodes).toHaveLength(0);
      expect(newState.nodes).toHaveLength(1);
    });
  });

  describe('DeleteNodeCommand', () => {
    it('应该删除节点', () => {
      const stateWithNode = { ...initialState, nodes: [testNode] };
      const command = new DeleteNodeCommand('node-1');
      const newState = command.execute(stateWithNode);

      expect(newState.nodes).toHaveLength(0);
    });

    it('应该撤销删除节点', () => {
      const stateWithNode = { ...initialState, nodes: [testNode] };
      const command = new DeleteNodeCommand('node-1');
      const newState = command.execute(stateWithNode);
      const undoState = command.undo(newState);

      expect(undoState.nodes).toHaveLength(1);
      expect(undoState.nodes[0]).toEqual(testNode);
    });

    it('应该删除相关连接', () => {
      const stateWithNodeAndConn = {
        nodes: [testNode],
        connections: [testConnection],
      };
      const command = new DeleteNodeCommand('node-1');
      const newState = command.execute(stateWithNodeAndConn);

      expect(newState.connections).toHaveLength(0);
    });

    it('应该恢复相关连接', () => {
      const stateWithNodeAndConn = {
        nodes: [testNode],
        connections: [testConnection],
      };
      const command = new DeleteNodeCommand('node-1');
      const newState = command.execute(stateWithNodeAndConn);
      const undoState = command.undo(newState);

      expect(undoState.connections).toHaveLength(1);
      expect(undoState.connections[0]).toEqual(testConnection);
    });
  });

  describe('UpdateNodeCommand', () => {
    it('应该更新节点', () => {
      const stateWithNode = { ...initialState, nodes: [testNode] };
      const updates = { data: { ...testNode.data, title: '更新后的标题' } };
      const command = new UpdateNodeCommand('node-1', updates);
      const newState = command.execute(stateWithNode);

      expect(newState.nodes[0].data.title).toBe('更新后的标题');
    });

    it('应该撤销更新节点', () => {
      const stateWithNode = { ...initialState, nodes: [testNode] };
      const updates = { data: { ...testNode.data, title: '更新后的标题' } };
      const command = new UpdateNodeCommand('node-1', updates);
      const newState = command.execute(stateWithNode);
      const undoState = command.undo(newState);

      expect(undoState.nodes[0].data.title).toBe('测试节点');
    });
  });

  describe('MoveNodeCommand', () => {
    it('应该移动节点', () => {
      const stateWithNode = { ...initialState, nodes: [testNode] };
      const newPosition = { x: 200, y: 200 };
      const command = new MoveNodeCommand('node-1', newPosition);
      const newState = command.execute(stateWithNode);

      expect(newState.nodes[0].data.position).toEqual(newPosition);
    });

    it('应该撤销移动节点', () => {
      const stateWithNode = { ...initialState, nodes: [testNode] };
      const newPosition = { x: 200, y: 200 };
      const command = new MoveNodeCommand('node-1', newPosition);
      const newState = command.execute(stateWithNode);
      const undoState = command.undo(newState);

      expect(undoState.nodes[0].data.position).toEqual({ x: 100, y: 100 });
    });
  });

  describe('CreateConnectionCommand', () => {
    it('应该创建连接', () => {
      const command = new CreateConnectionCommand(testConnection);
      const newState = command.execute(initialState);

      expect(newState.connections).toHaveLength(1);
      expect(newState.connections[0]).toEqual(testConnection);
    });

    it('应该撤销创建连接', () => {
      const command = new CreateConnectionCommand(testConnection);
      const newState = command.execute(initialState);
      const undoState = command.undo(newState);

      expect(undoState.connections).toHaveLength(0);
    });
  });

  describe('DeleteConnectionCommand', () => {
    it('应该删除连接', () => {
      const stateWithConn = { ...initialState, connections: [testConnection] };
      const command = new DeleteConnectionCommand('node-1', 'node-2');
      const newState = command.execute(stateWithConn);

      expect(newState.connections).toHaveLength(0);
    });

    it('应该撤销删除连接', () => {
      const stateWithConn = { ...initialState, connections: [testConnection] };
      const command = new DeleteConnectionCommand('node-1', 'node-2');
      const newState = command.execute(stateWithConn);
      const undoState = command.undo(newState);

      expect(undoState.connections).toHaveLength(1);
      expect(undoState.connections[0]).toEqual(testConnection);
    });
  });

  describe('BatchCommand', () => {
    it('应该执行批量命令', () => {
      const node2: LegalNode = { ...testNode, id: 'node-2' };
      const commands = [
        new CreateNodeCommand(testNode),
        new CreateNodeCommand(node2),
        new CreateConnectionCommand(testConnection),
      ];
      const batchCommand = new BatchCommand(commands);
      const newState = batchCommand.execute(initialState);

      expect(newState.nodes).toHaveLength(2);
      expect(newState.connections).toHaveLength(1);
    });

    it('应该撤销批量命令', () => {
      const node2: LegalNode = { ...testNode, id: 'node-2' };
      const commands = [
        new CreateNodeCommand(testNode),
        new CreateNodeCommand(node2),
        new CreateConnectionCommand(testConnection),
      ];
      const batchCommand = new BatchCommand(commands);
      const newState = batchCommand.execute(initialState);
      const undoState = batchCommand.undo(newState);

      expect(undoState.nodes).toHaveLength(0);
      expect(undoState.connections).toHaveLength(0);
    });
  });

  describe('CommandHistory', () => {
    let history: CommandHistory<WorkspaceCommandState>;

    beforeEach(() => {
      history = new CommandHistory<WorkspaceCommandState>(50);
    });

    it('应该执行命令并添加到历史记录', () => {
      const command = new CreateNodeCommand(testNode);
      const newState = history.execute(command, initialState);

      expect(newState.nodes).toHaveLength(1);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('应该撤销命令', () => {
      const command = new CreateNodeCommand(testNode);
      const newState = history.execute(command, initialState);
      const undoState = history.undo(newState);

      expect(undoState).not.toBeNull();
      expect(undoState!.nodes).toHaveLength(0);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('应该重做命令', () => {
      const command = new CreateNodeCommand(testNode);
      const newState = history.execute(command, initialState);
      const undoState = history.undo(newState);
      const redoState = history.redo(undoState!);

      expect(redoState).not.toBeNull();
      expect(redoState!.nodes).toHaveLength(1);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('应该限制历史记录数量', () => {
      const smallHistory = new CommandHistory<WorkspaceCommandState>(3);
      let state = initialState;

      for (let i = 0; i < 5; i++) {
        const node: LegalNode = { ...testNode, id: `node-${i}` };
        const command = new CreateNodeCommand(node);
        state = smallHistory.execute(command, state);
      }

      const historyList = smallHistory.getHistory();
      expect(historyList).toHaveLength(3);
    });

    it('执行新命令后应该清除重做历史', () => {
      const command1 = new CreateNodeCommand(testNode);
      const command2 = new CreateNodeCommand({ ...testNode, id: 'node-2' });

      let state = history.execute(command1, initialState);
      state = history.execute(command2, state);
      state = history.undo(state)!; // 撤销command2

      expect(history.canRedo()).toBe(true);

      // 执行新命令
      const command3 = new CreateNodeCommand({ ...testNode, id: 'node-3' });
      history.execute(command3, state);

      expect(history.canRedo()).toBe(false);
    });

    it('应该清空历史记录', () => {
      const command = new CreateNodeCommand(testNode);
      history.execute(command, initialState);
      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.getHistory()).toHaveLength(0);
    });
  });
});

