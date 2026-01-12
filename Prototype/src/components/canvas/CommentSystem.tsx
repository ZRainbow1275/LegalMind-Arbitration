/**
 * 评论系统
 * 
 * 提供评论、批注和讨论功能
 */

import React, { useState } from 'react';
import { useCollaborationStore, type Comment } from '../../lib/collaboration-engine';

// ==================== 评论气泡组件 ====================

interface CommentBubbleProps {
  comment: Comment;
  viewportTransform: {
    x: number;
    y: number;
    zoom: number;
  };
  onClick: () => void;
}

export const CommentBubble: React.FC<CommentBubbleProps> = ({
  comment,
  viewportTransform,
  onClick,
}) => {



  // 应用视口变换
  const screenX = comment.position.x * viewportTransform.zoom + viewportTransform.x;
  const screenY = comment.position.y * viewportTransform.zoom + viewportTransform.y;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        transform: 'translate(-50%, -100%)',
        cursor: 'pointer',
        zIndex: 100,
      }}
      onClick={onClick}
    >
      {/* 评论图标 */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: comment.resolved ? '#10b981' : '#f97316',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          border: '2px solid #ffffff',
        }}
      >
        💬
      </div>

      {/* 未读标记 */}
      {!comment.resolved && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #ffffff',
          }}
        />
      )}
    </div>
  );
};

// ==================== 评论面板组件 ====================

interface CommentPanelProps {
  comment: Comment | null;
  onClose: () => void;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  comment,
  onClose,
}) => {
  const { users, currentUser, replyToComment, resolveComment } = useCollaborationStore();
  const [replyContent, setReplyContent] = useState('');

  if (!comment) return null;

  const author = users.get(comment.userId);

  const handleReply = () => {
    if (replyContent.trim()) {
      replyToComment(comment.id, replyContent);
      setReplyContent('');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 400,
        maxHeight: '80vh',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2000,
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1f2937' }}>
          评论详情
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!comment.resolved && currentUser && (
            <button
              onClick={() => resolveComment(comment.id)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              ✓ 解决
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {/* 主评论 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: author?.color || '#9ca3af',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
              }}
            >
              {author?.name.charAt(0).toUpperCase() || '?'}
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                {author?.name || '未知用户'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              backgroundColor: '#f9fafb',
              borderRadius: 8,
              fontSize: 14,
              color: '#1f2937',
              lineHeight: 1.5,
            }}
          >
            {comment.content}
          </div>
        </div>

        {/* 回复列表 */}
        {comment.replies.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: '#6b7280',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              回复 ({comment.replies.length})
            </div>

            {comment.replies.map(reply => {
              const replyAuthor = users.get(reply.userId);
              return (
                <div key={reply.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: replyAuthor?.color || '#9ca3af',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      {replyAuthor?.name.charAt(0).toUpperCase() || '?'}
                    </div>

                    <div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1f2937' }}>
                        {replyAuthor?.name || '未知用户'}
                      </span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>
                        {new Date(reply.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginLeft: 32,
                      padding: 8,
                      backgroundColor: '#f9fafb',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#1f2937',
                    }}
                  >
                    {reply.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 回复输入框 */}
      {!comment.resolved && currentUser && (
        <div
          style={{
            padding: 16,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="输入回复..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f97316';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={handleReply}
              disabled={!replyContent.trim()}
              style={{
                padding: '8px 16px',
                backgroundColor: replyContent.trim() ? '#f97316' : '#e5e7eb',
                color: replyContent.trim() ? '#ffffff' : '#9ca3af',
                border: 'none',
                borderRadius: 6,
                cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              发送回复
            </button>
          </div>
        </div>
      )}

      {/* 已解决标记 */}
      {comment.resolved && (
        <div
          style={{
            padding: 16,
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f0fdf4',
            textAlign: 'center',
            color: '#10b981',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          ✓ 此评论已解决
        </div>
      )}
    </div>
  );
};

// ==================== 评论列表组件 ====================

export const CommentList: React.FC<{ onSelectComment: (comment: Comment) => void }> = ({
  onSelectComment,
}) => {
  const { comments } = useCollaborationStore();
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const filteredComments = Array.from(comments.values()).filter(comment => {
    if (filter === 'unresolved') return !comment.resolved;
    if (filter === 'resolved') return comment.resolved;
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        width: 300,
        maxHeight: 400,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
    >
      {/* 头部 */}
      <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
          评论 ({filteredComments.length})
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'unresolved', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: filter === f ? '#f97316' : '#f3f4f6',
                color: filter === f ? '#ffffff' : '#6b7280',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {f === 'all' ? '全部' : f === 'unresolved' ? '未解决' : '已解决'}
            </button>
          ))}
        </div>
      </div>

      {/* 评论列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {filteredComments.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>
            暂无评论
          </div>
        ) : (
          filteredComments.map(comment => (
            <div
              key={comment.id}
              onClick={() => onSelectComment(comment)}
              style={{
                padding: 12,
                marginBottom: 8,
                backgroundColor: '#f9fafb',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
            >
              <div style={{ fontSize: 13, color: '#1f2937', marginBottom: 4 }}>
                {comment.content.substring(0, 50)}
                {comment.content.length > 50 && '...'}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {comment.replies.length} 回复
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

