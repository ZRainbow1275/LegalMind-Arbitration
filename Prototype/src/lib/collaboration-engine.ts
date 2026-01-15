/**
 * 协作引擎
 *
 * 提供实时协作功能，包括WebSocket通信、操作广播、冲突解决
 *
 * ⚠️ **未来功能** - 需要WebSocket后端服务器支持
 *
 * **当前状态**：
 * - 前端代码已完成
 * - 后端服务器未实现
 * - 功能完全不可用
 *
 * **使用前提**：
 * 1. 需要实现WebSocket服务器（推荐使用Socket.io）
 * 2. 服务器需要支持以下事件：
 *    - connection/disconnect
 *    - join-canvas/leave-canvas
 *    - operation/cursor-move/selection-change
 *    - comment-add/comment-update/comment-delete
 * 3. 需要实现操作转换（OT）或CRDT算法处理冲突
 *
 * **预计工作量**：3-5天
 *
 * **建议**：
 * - 在生产环境中禁用此功能
 * - 或者使用第三方协作服务（如Yjs、Automerge）
 */

import { create } from 'zustand';
import type { Position, Operation } from '../types/canvas-elements';
import { performanceMonitor } from './performance-monitor';

// ==================== 类型定义 ====================

export interface User {
  id: string;
  name: string;
  avatar?: string;
  color: string; // 用户标识颜色
  online: boolean;
}

export interface UserCursor {
  userId: string;
  position: Position;
  timestamp: number;
}

export interface UserSelection {
  userId: string;
  elementIds: string[];
  timestamp: number;
}

export interface Comment {
  id: string;
  userId: string;
  elementId?: string; // 关联的元素ID（可选）
  position: Position; // 评论位置
  content: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface CollaborationMessage {
  type: 'operation' | 'cursor' | 'selection' | 'comment' | 'user_join' | 'user_leave';
  userId: string;
  timestamp: number;
  data: any;
}

// ==================== 协作Store ====================

interface CollaborationStore {
  // 连接状态
  connected: boolean;
  connecting: boolean;
  error: string | null;

  // 用户
  currentUser: User | null;
  users: Map<string, User>;

  // 实时状态
  cursors: Map<string, UserCursor>;
  selections: Map<string, UserSelection>;

  // 评论
  comments: Map<string, Comment>;

  // WebSocket
  ws: WebSocket | null;

  // 操作
  connect: (canvasId: string, user: User) => Promise<void>;
  disconnect: () => void;
  sendOperation: (operation: Operation) => void;
  sendCursor: (position: Position) => void;
  sendSelection: (elementIds: string[]) => void;
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'userId' | 'resolved'>) => void;
  replyToComment: (commentId: string, content: string) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;

  // 内部方法
  handleMessage: (message: CollaborationMessage) => void;
}

export const useCollaborationStore = create<CollaborationStore>((set, get) => ({
  // ==================== 初始状态 ====================

  connected: false,
  connecting: false,
  error: null,
  currentUser: null,
  users: new Map(),
  cursors: new Map(),
  selections: new Map(),
  comments: new Map(),
  ws: null,

  // ==================== 连接管理 ====================

  connect: async (canvasId: string, user: User) => {
    const perfId = performanceMonitor.start('建立协作连接', 'operation');

    set({ connecting: true, error: null });

    try {
      // ⚠️ 注意：此功能需要WebSocket服务器支持
      // 当前为前端原型实现，实际使用需要：
      // 1. 实现WebSocket服务器（Node.js + Socket.io）
      // 2. 或使用第三方服务（如Ably、Pusher）
      // 3. 或集成到LegalMind主项目的后端
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.host;
      const ws = new WebSocket(`${wsProtocol}//${wsHost}/canvas/${canvasId}`);

      ws.onopen = () => {
        console.log('[Collaboration] WebSocket连接已建立');

        // 发送用户加入消息
        ws.send(JSON.stringify({
          type: 'user_join',
          userId: user.id,
          timestamp: Date.now(),
          data: user,
        }));

        set({
          connected: true,
          connecting: false,
          currentUser: user,
          ws,
        });

        performanceMonitor.end(perfId);
      };

      ws.onerror = (error) => {
        console.error('[Collaboration] WebSocket错误:', error);
        set({
          connected: false,
          connecting: false,
          error: 'WebSocket连接失败',
        });
        performanceMonitor.end(perfId);
      };

      ws.onclose = () => {
        console.log('[Collaboration] WebSocket连接已关闭');
        set({
          connected: false,
          ws: null,
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: CollaborationMessage = JSON.parse(event.data);
          get().handleMessage(message);
        } catch (error) {
          console.error('[Collaboration] 消息解析失败:', error);
        }
      };

    } catch (error) {
      console.error('[Collaboration] 连接失败:', error);
      set({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : '连接失败',
      });
      performanceMonitor.end(perfId);
    }
  },

  disconnect: () => {
    const { ws, currentUser } = get();

    if (ws && currentUser) {
      // 发送用户离开消息
      ws.send(JSON.stringify({
        type: 'user_leave',
        userId: currentUser.id,
        timestamp: Date.now(),
        data: null,
      }));

      ws.close();
    }

    set({
      connected: false,
      ws: null,
      users: new Map(),
      cursors: new Map(),
      selections: new Map(),
    });
  },

  // ==================== 发送操作 ====================

  sendOperation: (operation: Operation) => {
    const { ws, currentUser, connected } = get();

    if (!connected || !ws || !currentUser) {
      console.warn('[Collaboration] 未连接，无法发送操作');
      return;
    }

    const message: CollaborationMessage = {
      type: 'operation',
      userId: currentUser.id,
      timestamp: Date.now(),
      data: operation,
    };

    ws.send(JSON.stringify(message));
  },

  sendCursor: (position: Position) => {
    const { ws, currentUser, connected } = get();

    if (!connected || !ws || !currentUser) return;

    const message: CollaborationMessage = {
      type: 'cursor',
      userId: currentUser.id,
      timestamp: Date.now(),
      data: position,
    };

    ws.send(JSON.stringify(message));
  },

  sendSelection: (elementIds: string[]) => {
    const { ws, currentUser, connected } = get();

    if (!connected || !ws || !currentUser) return;

    const message: CollaborationMessage = {
      type: 'selection',
      userId: currentUser.id,
      timestamp: Date.now(),
      data: elementIds,
    };

    ws.send(JSON.stringify(message));
  },

  // ==================== 评论管理 ====================

  addComment: (commentData) => {
    const { currentUser, comments } = get();
    if (!currentUser) return;

    const comment: Comment = {
      ...commentData,
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      replies: [],
    };

    const newComments = new Map(comments);
    newComments.set(comment.id, comment);
    set({ comments: newComments });

    // 广播评论
    const { ws } = get();
    if (ws) {
      ws.send(JSON.stringify({
        type: 'comment',
        userId: currentUser.id,
        timestamp: Date.now(),
        data: { action: 'add', comment },
      }));
    }
  },

  replyToComment: (commentId: string, content: string) => {
    const { currentUser, comments } = get();
    if (!currentUser) return;

    const comment = comments.get(commentId);
    if (!comment) return;

    const reply: CommentReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };

    const updatedComment = {
      ...comment,
      replies: [...comment.replies, reply],
      updatedAt: new Date().toISOString(),
    };

    const newComments = new Map(comments);
    newComments.set(commentId, updatedComment);
    set({ comments: newComments });
  },

  resolveComment: (commentId: string) => {
    const { comments } = get();
    const comment = comments.get(commentId);
    if (!comment) return;

    const updatedComment = {
      ...comment,
      resolved: true,
      updatedAt: new Date().toISOString(),
    };

    const newComments = new Map(comments);
    newComments.set(commentId, updatedComment);
    set({ comments: newComments });
  },

  deleteComment: (commentId: string) => {
    const { comments } = get();
    const newComments = new Map(comments);
    newComments.delete(commentId);
    set({ comments: newComments });
  },

  // ==================== 消息处理 ====================

  handleMessage: (message: CollaborationMessage) => {
    const { currentUser } = get();

    // 忽略自己的消息
    if (currentUser && message.userId === currentUser.id) {
      return;
    }

    switch (message.type) {
      case 'user_join': {
        const user: User = message.data;
        const { users } = get();
        const newUsers = new Map(users);
        newUsers.set(user.id, user);
        set({ users: newUsers });
        console.log(`[Collaboration] 用户加入: ${user.name}`);
        break;
      }

      case 'user_leave': {
        const { users, cursors, selections } = get();
        const newUsers = new Map(users);
        const newCursors = new Map(cursors);
        const newSelections = new Map(selections);

        newUsers.delete(message.userId);
        newCursors.delete(message.userId);
        newSelections.delete(message.userId);

        set({ users: newUsers, cursors: newCursors, selections: newSelections });
        console.log(`[Collaboration] 用户离开: ${message.userId}`);
        break;
      }

      case 'cursor': {
        const position: Position = message.data;
        const { cursors } = get();
        const newCursors = new Map(cursors);
        newCursors.set(message.userId, {
          userId: message.userId,
          position,
          timestamp: message.timestamp,
        });
        set({ cursors: newCursors });
        break;
      }

      case 'selection': {
        const elementIds: string[] = message.data;
        const { selections } = get();
        const newSelections = new Map(selections);
        newSelections.set(message.userId, {
          userId: message.userId,
          elementIds,
          timestamp: message.timestamp,
        });
        set({ selections: newSelections });
        break;
      }

      case 'operation': {
        const operation: Operation = message.data;
        // 这里应该应用远程操作到本地画布
        // 需要与canvas-store集成
        console.log('[Collaboration] 收到远程操作:', operation);
        break;
      }

      case 'comment': {
        const { action, comment } = message.data;
        if (action === 'add') {
          const { comments } = get();
          const newComments = new Map(comments);
          newComments.set(comment.id, comment);
          set({ comments: newComments });
        }
        break;
      }
    }
  },
}));
