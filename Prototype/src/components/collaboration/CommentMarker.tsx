/**
 * 评论标记组件
 * 显示在画布上的评论图标
 */

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { Comment } from '../../types/comment';

interface CommentMarkerProps {
  comment: Comment;
  scale: number; // 画布缩放比例
  onClick: () => void;
  isActive: boolean;
}

export const CommentMarker: React.FC<CommentMarkerProps> = ({
  comment,
  scale,
  onClick,
  isActive,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // 计算未读回复数量（简化版，实际应该跟踪已读状态）
  const unreadCount = comment.replies.length;

  // 已解决的评论显示为灰色
  const markerColor = comment.resolved ? '#9CA3AF' : comment.author.color;

  // 标记大小（不受缩放影响）


  // 计算位置（考虑缩放）
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${comment.position.x}px`,
    top: `${comment.position.y}px`,
    transform: `scale(${1 / scale})`, // 反向缩放，保持标记大小不变
    transformOrigin: 'center center',
    cursor: 'pointer',
    zIndex: isActive ? 1000 : 100,
  };

  return (
    <div
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="comment-marker"
    >
      {/* 评论图标 */}
      <div
        className={`
          relative flex items-center justify-center
          w-8 h-8 rounded-full
          transition-all duration-200
          ${isActive ? 'ring-2 ring-offset-2' : ''}
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
        style={{
          backgroundColor: markerColor,
        }}
      >
        <MessageSquare className="w-4 h-4 text-white" />

        {/* 未读回复徽章 */}
        {unreadCount > 0 && !comment.resolved && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}

        {/* 已解决标记 */}
        {comment.resolved && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* 悬停预览 */}
      {isHovered && !isActive && (
        <div
          className="absolute left-10 top-0 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-start gap-2 mb-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: comment.author.color }}
            >
              {comment.author.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {comment.author.name}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-700 line-clamp-3">
            {comment.content}
          </div>
          {comment.replies.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {comment.replies.length} 条回复
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CommentMarker.displayName = 'CommentMarker';

