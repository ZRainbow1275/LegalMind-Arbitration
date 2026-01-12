/**
 * 聊天贴图层组件
 * 
 * 管理画布上所有的聊天贴
 * 提供创建、删除、定位等功能
 */

import React from 'react';
import { ChatNote } from './ChatNote';
import { useCommentStore } from '../stores/comment-store';

export interface ChatNoteLayerProps {
  className?: string;
}

/**
 * 聊天贴图层组件
 */
export const ChatNoteLayer: React.FC<ChatNoteLayerProps> = ({ className }) => {
  const comments = useCommentStore((state) => state.comments);
  const deleteComment = useCommentStore((state) => state.deleteComment);

  return (
    <div className={className} style={{ pointerEvents: 'none' }}>
      {comments.map((comment) => (
        <div key={comment.id} style={{ pointerEvents: 'auto' }}>
          <ChatNote
            id={comment.id}
            position={comment.position}
            onDelete={() => deleteComment(comment.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ChatNoteLayer;

