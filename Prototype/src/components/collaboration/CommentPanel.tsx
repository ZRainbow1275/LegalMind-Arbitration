/**
 * 评论详情面板组件
 * 显示评论内容和回复列表
 */

import React, { useState } from 'react';
import { X, Check, Trash2, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { useCommentStore } from '../../stores/comment-store';
import type { Comment } from '../../types/comment';

interface CommentPanelProps {
  comment: Comment;
  onClose: () => void;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  comment,
  onClose,
}) => {
  const [replyContent, setReplyContent] = useState('');
  const { addReply, resolveComment, unresolveComment, deleteComment, deleteReply } = useCommentStore();

  // 处理添加回复
  const handleAddReply = () => {
    console.log('[CommentPanel] handleAddReply called, replyContent:', replyContent);
    if (replyContent.trim()) {
      console.log('[CommentPanel] Adding reply to comment:', comment.id);
      addReply({
        commentId: comment.id,
        content: replyContent.trim(),
      });
      setReplyContent('');
      console.log('[CommentPanel] Reply added, content cleared');
    } else {
      console.log('[CommentPanel] Reply content is empty, not adding');
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddReply();
    }
  };

  // 处理标记为已解决/未解决
  const handleToggleResolve = () => {
    if (comment.resolved) {
      unresolveComment(comment.id);
    } else {
      resolveComment(comment.id);
    }
  };

  // 处理删除评论
  const handleDeleteComment = () => {
    if (confirm('确定要删除这条评论吗？')) {
      deleteComment(comment.id);
      onClose();
    }
  };

  // 处理删除回复
  const handleDeleteReply = (replyId: string) => {
    if (confirm('确定要删除这条回复吗？')) {
      deleteReply(comment.id, replyId);
    }
  };

  return (
    <div className="fixed right-4 top-20 w-96 h-[calc(100vh-6rem)] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">评论详情</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 评论内容区 */}
      <ScrollArea className="flex-1 p-4">
        {/* 主评论 */}
        <div className="mb-4">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: comment.author.color }}
            >
              {comment.author.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.createdAt).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {comment.content}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 ml-11">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleResolve}
              className={`h-7 text-xs ${comment.resolved
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-green-600 hover:text-green-700'
                }`}
            >
              <Check className="w-3 h-3 mr-1" />
              {comment.resolved ? '标记为未解决' : '标记为已解决'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteComment}
              className="h-7 text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              删除
            </Button>
          </div>
        </div>

        {/* 回复列表 */}
        {comment.replies.length > 0 && (
          <div className="space-y-3 mb-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              回复 ({comment.replies.length})
            </div>
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-gray-200">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: reply.author.color }}
                >
                  {reply.author.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900">
                      {reply.author.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(reply.createdAt).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {reply.content}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteReply(reply.id)}
                    className="h-6 text-xs text-red-600 hover:text-red-700 mt-1 px-2"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 回复输入区 */}
      {!comment.resolved && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="添加回复... (Ctrl+Enter 发送)"
              className="flex-1 min-h-[60px] max-h-[120px] text-sm resize-none"
            />
            <Button
              onClick={handleAddReply}
              disabled={!replyContent.trim()}
              size="icon"
              className="h-[60px] w-[60px] bg-orange-500 hover:bg-orange-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            提示：按 Ctrl+Enter 快速发送回复
          </div>
        </div>
      )}

      {/* 已解决提示 */}
      {comment.resolved && (
        <div className="p-4 border-t border-gray-200 bg-green-50">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4" />
            <span>此评论已标记为已解决</span>
          </div>
        </div>
      )}
    </div>
  );
};

CommentPanel.displayName = 'CommentPanel';

