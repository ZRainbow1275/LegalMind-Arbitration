/**
 * 聊天贴组件
 * 
 * 类似Figma Comments的画布聊天贴功能
 * 支持多人协作聊天、回复、@提及等
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Check, MoreVertical, Trash2, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCommentStore } from '../stores/comment-store';
import { useDraggable } from '../hooks/useDraggable';

export interface ChatNoteProps {
  id: string;
  position: { x: number; y: number };
  onClose?: () => void;
  onDelete?: () => void;
  className?: string;
}

/**
 * 聊天贴组件
 */
export const ChatNote: React.FC<ChatNoteProps> = ({
  id,
  position,

  onDelete,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // {{ AURA: Add - 拖拽支持 }}
  const { position: dragPosition, handleMouseDown, elementRef } = useDraggable({
    initialPosition: position
  });

  // 从Store获取评论数据
  const comment = useCommentStore((state) => state.getComment(id));
  const addReply = useCommentStore((state) => state.addReply);
  const resolveComment = useCommentStore((state) => state.resolveComment);
  const deleteComment = useCommentStore((state) => state.deleteComment);


  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // 如果评论不存在，不渲染
  if (!comment) {
    return null;
  }

  // 处理发送回复
  const handleSendReply = () => {
    if (!replyText.trim()) return;

    addReply({
      commentId: id,
      content: replyText.trim(),
    });

    setReplyText('');
    inputRef.current?.focus();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // 处理解决评论
  const handleResolve = () => {
    resolveComment(id);
    setShowMenu(false);
  };

  // 处理删除评论
  const handleDelete = () => {
    deleteComment(id);
    onDelete?.();
    setShowMenu(false);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        'absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200',
        'transition-all duration-200',
        isExpanded ? 'w-80' : 'w-10 h-10',
        className
      )}
      style={{
        transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
        left: 0,
        top: 0,
      }}
    >
      {/* 折叠状态 */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          onMouseDown={handleMouseDown}
          className="w-full h-full flex items-center justify-center text-orange-500 hover:bg-orange-50 rounded-lg transition-colors cursor-move"
          title="展开聊天贴"
        >
          <MessageSquare className="w-5 h-5" />
          {comment.replies.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {comment.replies.length}
            </span>
          )}
        </button>
      )}

      {/* 展开状态 */}
      {isExpanded && (
        <div className="flex flex-col max-h-96">
          {/* 头部 */}
          <div
            className="flex items-center justify-between p-3 border-b border-gray-200 cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-900">
                聊天贴
              </span>
              {comment.resolved && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  已解决
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* 更多菜单 */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="更多选项"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
                    {!comment.resolved && (
                      <button
                        onClick={handleResolve}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        标记为已解决
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                )}
              </div>
              {/* 折叠按钮 */}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="折叠"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64">
            {/* 主评论 */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                {comment.author.avatar ? (
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-orange-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 break-words">
                  {comment.content}
                </p>
              </div>
            </div>

            {/* 回复列表 */}
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-2 ml-6">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  {reply.author.avatar ? (
                    <img
                      src={reply.author.avatar}
                      alt={reply.author.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-900">
                      {reply.author.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-0.5 break-words">
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 输入框 */}
          {!comment.resolved && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入回复..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    replyText.trim()
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                  title="发送"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatNote;

