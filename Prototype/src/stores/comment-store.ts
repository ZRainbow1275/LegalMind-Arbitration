/**
 * 评论系统状态管理
 * 使用Zustand管理画布留言贴状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Comment,
  CommentReply,
  CreateCommentParams,
  UpdateCommentParams,
  CreateReplyParams,
  CommentAuthor,
} from '../types/comment';

/**
 * 评论Store接口
 */
interface CommentStore {
  // 状态
  comments: Comment[];
  activeCommentId: string | null;
  isCreatingComment: boolean;
  currentUser: CommentAuthor; // 当前用户信息

  // Actions - 评论管理
  addComment: (params: CreateCommentParams) => string; // 返回新评论ID
  updateComment: (id: string, params: UpdateCommentParams) => void;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  unresolveComment: (id: string) => void;

  // Actions - 回复管理
  addReply: (params: CreateReplyParams) => void;
  deleteReply: (commentId: string, replyId: string) => void;

  // Actions - UI状态
  setActiveComment: (id: string | null) => void;
  startCreatingComment: () => void;
  cancelCreatingComment: () => void;

  // Actions - 用户管理
  setCurrentUser: (user: CommentAuthor) => void;

  // Getters
  getComment: (id: string) => Comment | undefined;
  getUnresolvedComments: () => Comment[];
  getResolvedComments: () => Comment[];
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 默认用户颜色列表
 */
const USER_COLORS = [
  '#FF6B35', // LegalMind橙色
  '#4ECDC4', // 青色
  '#45B7D1', // 蓝色
  '#96CEB4', // 绿色
  '#FFEAA7', // 黄色
  '#DFE6E9', // 灰色
  '#74B9FF', // 浅蓝
  '#A29BFE', // 紫色
  '#FD79A8', // 粉色
  '#FDCB6E', // 橙黄
];

/**
 * 获取随机用户颜色
 */
const getRandomUserColor = (): string => {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
};

/**
 * 默认当前用户
 */
const DEFAULT_USER: CommentAuthor = {
  id: 'user-1',
  name: '当前用户',
  color: USER_COLORS[0], // LegalMind橙色
};

/**
 * 创建评论Store
 */
export const useCommentStore = create<CommentStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      comments: [],
      activeCommentId: null,
      isCreatingComment: false,
      currentUser: DEFAULT_USER,

      // 添加评论
      addComment: (params: CreateCommentParams) => {
        const newComment: Comment = {
          id: generateId(),
          position: params.position,
          author: get().currentUser,
          content: params.content,
          createdAt: new Date(),
          resolved: false,
          replies: [],
          mentions: params.mentions || [],
        };

        set((state) => ({
          comments: [...state.comments, newComment],
          isCreatingComment: false,
          activeCommentId: newComment.id,
        }));


        return newComment.id;
      },

      // 更新评论
      updateComment: (id: string, params: UpdateCommentParams) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === id
              ? {
                ...comment,
                content: params.content,
                mentions: params.mentions || comment.mentions,
                updatedAt: new Date(),
              }
              : comment
          ),
        }));


      },

      // 删除评论
      deleteComment: (id: string) => {
        set((state) => ({
          comments: state.comments.filter((comment) => comment.id !== id),
          activeCommentId: state.activeCommentId === id ? null : state.activeCommentId,
        }));


      },

      // 标记为已解决
      resolveComment: (id: string) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === id
              ? { ...comment, resolved: true, updatedAt: new Date() }
              : comment
          ),
        }));


      },

      // 标记为未解决
      unresolveComment: (id: string) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === id
              ? { ...comment, resolved: false, updatedAt: new Date() }
              : comment
          ),
        }));


      },

      // 添加回复
      addReply: (params: CreateReplyParams) => {
        const newReply: CommentReply = {
          id: generateId(),
          author: get().currentUser,
          content: params.content,
          createdAt: new Date(),
        };

        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === params.commentId
              ? {
                ...comment,
                replies: [...comment.replies, newReply],
                updatedAt: new Date(),
              }
              : comment
          ),
        }));


      },

      // 删除回复
      deleteReply: (commentId: string, replyId: string) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                ...comment,
                replies: comment.replies.filter((reply) => reply.id !== replyId),
                updatedAt: new Date(),
              }
              : comment
          ),
        }));


      },

      // 设置活动评论
      setActiveComment: (id: string | null) => {
        set({ activeCommentId: id });

      },

      // 开始创建评论
      startCreatingComment: () => {
        set({ isCreatingComment: true, activeCommentId: null });

      },

      // 取消创建评论
      cancelCreatingComment: () => {
        set({ isCreatingComment: false });

      },

      // 设置当前用户
      setCurrentUser: (user: CommentAuthor) => {
        set({ currentUser: user });

      },

      // 获取评论
      getComment: (id: string) => {
        return get().comments.find((comment) => comment.id === id);
      },

      // 获取未解决评论
      getUnresolvedComments: () => {
        return get().comments.filter((comment) => !comment.resolved);
      },

      // 获取已解决评论
      getResolvedComments: () => {
        return get().comments.filter((comment) => comment.resolved);
      },
    }),
    {
      name: 'legalmind-comment-storage',
      // 只持久化评论数据和当前用户，不持久化UI状态
      partialize: (state) => ({
        comments: state.comments,
        currentUser: state.currentUser,
      }),
    }
  )
);

// 导出工具函数
export { generateId, getRandomUserColor, USER_COLORS };

