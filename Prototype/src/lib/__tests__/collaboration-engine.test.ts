/**
 * 协作引擎单元测试
 *
 * 测试范围：
 * - 用户管理（加入/离开）
 * - 光标位置同步
 * - 选择状态同步
 * - 评论管理（添加/回复/解决/删除）
 * - 消息处理
 *
 * ⚠️ 注意：
 * - 不测试WebSocket连接（需要mock）
 * - 只测试核心业务逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCollaborationStore } from '../collaboration-engine';
import type { User, CollaborationMessage } from '../collaboration-engine';

describe('CollaborationEngine', () => {
  // 在每个测试前重置store
  beforeEach(() => {
    const store = useCollaborationStore.getState();
    store.disconnect();
    useCollaborationStore.setState({
      connected: false,
      connecting: false,
      error: null,
      currentUser: null,
      users: new Map(),
      cursors: new Map(),
      selections: new Map(),
      comments: new Map(),
      ws: null,
    });
  });

  // ==================== 用户管理 ====================

  describe('用户管理', () => {
    it('应该处理用户加入消息', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 模拟用户加入消息
      const message: CollaborationMessage = {
        type: 'user_join',
        userId: 'user-2',
        timestamp: Date.now(),
        data: {
          id: 'user-2',
          name: '李四',
          color: '#4ECDC4',
          online: true,
        },
      };

      store.handleMessage(message);

      // 验证用户已添加
      const users = useCollaborationStore.getState().users;
      expect(users.size).toBe(1);
      expect(users.get('user-2')).toEqual(message.data);
    });

    it('应该处理用户离开消息', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 添加一个用户
      const users = new Map();
      users.set('user-2', {
        id: 'user-2',
        name: '李四',
        color: '#4ECDC4',
        online: true,
      });
      useCollaborationStore.setState({ users });

      // 模拟用户离开消息
      const message: CollaborationMessage = {
        type: 'user_leave',
        userId: 'user-2',
        timestamp: Date.now(),
        data: null,
      };

      store.handleMessage(message);

      // 验证用户已移除
      const updatedUsers = useCollaborationStore.getState().users;
      expect(updatedUsers.size).toBe(0);
    });

    it('应该忽略自己的消息', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 模拟自己的用户加入消息
      const message: CollaborationMessage = {
        type: 'user_join',
        userId: 'user-1', // 自己的ID
        timestamp: Date.now(),
        data: currentUser,
      };

      store.handleMessage(message);

      // 验证用户列表为空（忽略了自己的消息）
      const users = useCollaborationStore.getState().users;
      expect(users.size).toBe(0);
    });
  });

  // ==================== 光标位置同步 ====================

  describe('光标位置同步', () => {
    it('应该处理光标位置消息', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 模拟光标位置消息
      const message: CollaborationMessage = {
        type: 'cursor',
        userId: 'user-2',
        timestamp: Date.now(),
        data: { x: 100, y: 200 },
      };

      store.handleMessage(message);

      // 验证光标位置已更新
      const cursors = useCollaborationStore.getState().cursors;
      expect(cursors.size).toBe(1);
      const cursor = cursors.get('user-2');
      expect(cursor).toBeDefined();
      expect(cursor?.position).toEqual({ x: 100, y: 200 });
      expect(cursor?.userId).toBe('user-2');
    });

    it('应该更新已存在用户的光标位置', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 第一次光标位置
      const message1: CollaborationMessage = {
        type: 'cursor',
        userId: 'user-2',
        timestamp: Date.now(),
        data: { x: 100, y: 200 },
      };
      store.handleMessage(message1);

      // 第二次光标位置
      const message2: CollaborationMessage = {
        type: 'cursor',
        userId: 'user-2',
        timestamp: Date.now() + 100,
        data: { x: 150, y: 250 },
      };
      store.handleMessage(message2);

      // 验证光标位置已更新
      const cursors = useCollaborationStore.getState().cursors;
      expect(cursors.size).toBe(1);
      const cursor = cursors.get('user-2');
      expect(cursor?.position).toEqual({ x: 150, y: 250 });
    });
  });

  // ==================== 选择状态同步 ====================

  describe('选择状态同步', () => {
    it('应该处理选择状态消息', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 模拟选择状态消息
      const message: CollaborationMessage = {
        type: 'selection',
        userId: 'user-2',
        timestamp: Date.now(),
        data: ['element-1', 'element-2'],
      };

      store.handleMessage(message);

      // 验证选择状态已更新
      const selections = useCollaborationStore.getState().selections;
      expect(selections.size).toBe(1);
      const selection = selections.get('user-2');
      expect(selection).toBeDefined();
      expect(selection?.elementIds).toEqual(['element-1', 'element-2']);
      expect(selection?.userId).toBe('user-2');
    });

    it('应该更新已存在用户的选择状态', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 第一次选择
      const message1: CollaborationMessage = {
        type: 'selection',
        userId: 'user-2',
        timestamp: Date.now(),
        data: ['element-1'],
      };
      store.handleMessage(message1);

      // 第二次选择
      const message2: CollaborationMessage = {
        type: 'selection',
        userId: 'user-2',
        timestamp: Date.now() + 100,
        data: ['element-2', 'element-3'],
      };
      store.handleMessage(message2);

      // 验证选择状态已更新
      const selections = useCollaborationStore.getState().selections;
      expect(selections.size).toBe(1);
      const selection = selections.get('user-2');
      expect(selection?.elementIds).toEqual(['element-2', 'element-3']);
    });
  });

  // ==================== 评论管理 ====================

  describe('评论管理', () => {
    it('应该添加评论', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 添加评论
      store.addComment({
        elementId: 'element-1',
        position: { x: 100, y: 200 },
        content: '这里需要修改',
      });

      // 验证评论已添加
      const comments = useCollaborationStore.getState().comments;
      expect(comments.size).toBe(1);

      const comment = Array.from(comments.values())[0];
      expect(comment.userId).toBe('user-1');
      expect(comment.content).toBe('这里需要修改');
      expect(comment.resolved).toBe(false);
      expect(comment.replies).toEqual([]);
    });

    it('应该回复评论', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 添加评论
      store.addComment({
        elementId: 'element-1',
        position: { x: 100, y: 200 },
        content: '这里需要修改',
      });

      const commentId = Array.from(useCollaborationStore.getState().comments.keys())[0];

      // 回复评论
      store.replyToComment(commentId, '已经修改了');

      // 验证回复已添加
      const comments = useCollaborationStore.getState().comments;
      const comment = comments.get(commentId);
      expect(comment?.replies.length).toBe(1);
      expect(comment?.replies[0].content).toBe('已经修改了');
      expect(comment?.replies[0].userId).toBe('user-1');
    });

    it('应该解决评论', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 添加评论
      store.addComment({
        elementId: 'element-1',
        position: { x: 100, y: 200 },
        content: '这里需要修改',
      });

      const commentId = Array.from(useCollaborationStore.getState().comments.keys())[0];

      // 解决评论
      store.resolveComment(commentId);

      // 验证评论已解决
      const comments = useCollaborationStore.getState().comments;
      const comment = comments.get(commentId);
      expect(comment?.resolved).toBe(true);
    });

    it('应该删除评论', () => {
      const store = useCollaborationStore.getState();

      // 设置当前用户
      const currentUser: User = {
        id: 'user-1',
        name: '张三',
        color: '#FF6B6B',
        online: true,
      };
      useCollaborationStore.setState({ currentUser });

      // 添加评论
      store.addComment({
        elementId: 'element-1',
        position: { x: 100, y: 200 },
        content: '这里需要修改',
      });

      const commentId = Array.from(useCollaborationStore.getState().comments.keys())[0];

      // 删除评论
      store.deleteComment(commentId);

      // 验证评论已删除
      const comments = useCollaborationStore.getState().comments;
      expect(comments.size).toBe(0);
    });
  });
});

