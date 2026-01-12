import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Users,
  Video,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Send,
  Clock,
  Activity
} from 'lucide-react';
import {
  collaborationSimulator,
  SimulatedUser,
  CollaborationActivity
} from '../../lib/collaboration-simulator';

import { DraggablePanel } from '../common/DraggablePanel';

interface MultiUserCollaborationProps {
  className?: string;
  onClose?: () => void;
}

import { useCursorStore } from '../../stores/cursor-store';
import type { UserCursor as SimCursor } from '../../lib/collaboration-simulator';

export const MultiUserCollaboration: React.FC<MultiUserCollaborationProps> = ({ className, onClose }) => {
  const [users, setUsers] = useState<SimulatedUser[]>([]);
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'activity'>('users');

  // {{ AURA: Add - 获取光标store更新函数 }}
  const { updateCursor } = useCursorStore();

  useEffect(() => {
    // Subscribe to simulator updates
    const unsubscribeUsers = collaborationSimulator.on('users', (updatedUsers: SimulatedUser[]) => {
      setUsers(updatedUsers);

      // {{ AURA: Add - 同步用户离开事件，移除光标 }}
      // 这里的逻辑稍微有点复杂，因为simulator只给当前用户列表
      // 简单起见，我们依靠cursor store的自动清理机制，或者在simulator中添加user-left事件
      // 但为了演示效果，我们可以在这里不做处理，让cursor store的超时机制工作
    });

    const unsubscribeActivities = collaborationSimulator.on('activities', setActivities);

    // {{ AURA: Add - 订阅光标更新 }}
    const unsubscribeCursors = collaborationSimulator.on('cursors', (cursors: SimCursor[]) => {
      const currentUsers = collaborationSimulator.getUsers();

      cursors.forEach(cursor => {
        const user = currentUsers.find(u => u.id === cursor.userId);
        if (user) {
          updateCursor({
            userId: cursor.userId,
            position: { x: cursor.x, y: cursor.y },
            userName: user.name,
            userColor: user.color
          });
        }
      });
    });

    // Initial data
    setUsers(collaborationSimulator.getUsers());
    setActivities(collaborationSimulator.getActivities());

    // Start simulation if not running
    collaborationSimulator.start();

    return () => {
      unsubscribeUsers();
      unsubscribeActivities();
      unsubscribeCursors(); // {{ AURA: Add - 取消订阅 }}
    };
  }, [updateCursor]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    // Add local message (in a real app this would go to backend)
    // For now we just clear input as the simulator handles "other" users
    setChatMessage('');
  };

  const toggleCall = () => {
    setIsCallActive(!isCallActive);
    if (!isCallActive) {
      // Simulate joining call
    }
  };

  return (
    <DraggablePanel
      title="实时协作"
      initialPosition={{ x: window.innerWidth - 400, y: 100 }}
      width={350}
      height={500}
      onClose={onClose}
      className={className}
    >
      <div className="flex flex-col h-full bg-white">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-base font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            在线协作 ({users.length})
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={isCallActive ? "destructive" : "outline"}
              size="icon"
              className="w-8 h-8"
              onClick={toggleCall}
            >
              {isCallActive ? <PhoneOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {isCallActive && (
          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t px-4 pb-3">
            <Button
              variant={isMuted ? "secondary" : "ghost"}
              size="icon"
              className="w-8 h-8 rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              variant={isScreenSharing ? "secondary" : "ghost"}
              size="icon"
              className="w-8 h-8 rounded-full"
              onClick={() => setIsScreenSharing(!isScreenSharing)}
            >
              <Monitor className="w-4 h-4" />
            </Button>
          </div>
        )}


        <div className="flex border-b">
          <button
            className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setActiveTab('users')}
          >
            成员
          </button>
          <button
            className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setActiveTab('chat')}
          >
            讨论
          </button>
          <button
            className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'activity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setActiveTab('activity')}
          >
            动态
          </button>
        </div>

        <div className="flex-1 p-0 overflow-hidden flex flex-col">
          {activeTab === 'users' && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="flex items-center gap-3 group">
                    <div className="relative">
                      <Avatar className="w-8 h-8 border-2" style={{ borderColor: user.color }}>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback style={{ backgroundColor: user.color + '20', color: user.color }}>
                          {user.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${user.status === 'online' ? 'bg-green-500' :
                        user.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{user.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {user.role === 'arbitrator' ? '仲裁员' :
                            user.role === 'lawyer' ? '律师' :
                              user.role === 'party' ? '当事人' : '访客'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.status === 'online' ? '正在查看...' : '离开'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {activeTab === 'chat' && (
            <>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="text-center text-xs text-gray-400 my-2">今天 10:23</div>
                  {/* Mock chat messages for now, could be enhanced to use simulator events */}
                  <div className="flex gap-2">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarFallback className="bg-blue-100 text-blue-600">李</AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-100 rounded-lg p-2 text-sm max-w-[80%]">
                      关于证据链这部分，我觉得需要补充一下合同原件的扫描件。
                    </div>
                  </div>
                  <div className="flex gap-2 flex-row-reverse">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarFallback className="bg-purple-100 text-purple-600">我</AvatarFallback>
                    </Avatar>
                    <div className="bg-blue-600 text-white rounded-lg p-2 text-sm max-w-[80%]">
                      好的，我已经准备好了，马上上传。
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="p-3 border-t bg-gray-50">
                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    placeholder="输入消息..."
                    className="h-8 text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button size="icon" className="h-8 w-8" onClick={handleSendMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'activity' && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {activities.map(activity => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className={`mt-1 p-1 rounded-full bg-gray-100 text-gray-500`}>
                      {activity.action === 'join' ? <Users className="w-3 h-3" /> :
                        activity.action === 'edit' ? <Activity className="w-3 h-3" /> :
                          <Clock className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-gray-900">
                        <span className="font-medium">{activity.userName}</span>
                        <span className="text-gray-600 mx-1">{activity.details}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {activity.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};
