/**
 * 评论系统数据模型
 * 用于画布留言贴功能
 */

/**
 * 用户信息
 */
export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  color: string; // 用户标识色，用于区分不同用户
}

/**
 * 评论回复
 */
export interface CommentReply {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 评论
 */
export interface Comment {
  id: string;
  position: { x: number; y: number }; // 画布坐标
  author: CommentAuthor;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved: boolean; // 是否已解决
  replies: CommentReply[];
  mentions: string[]; // @提及的用户ID列表
}

/**
 * 评论创建参数
 */
export interface CreateCommentParams {
  position: { x: number; y: number };
  content: string;
  mentions?: string[];
}

/**
 * 评论更新参数
 */
export interface UpdateCommentParams {
  content: string;
  mentions?: string[];
}

/**
 * 回复创建参数
 */
export interface CreateReplyParams {
  commentId: string;
  content: string;
}

