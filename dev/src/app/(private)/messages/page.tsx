// dev/src/app/(private)/messages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  MessageSquare,
  Send,
  Inbox,
  Archive,
  Trash2,
  Star,
  Search,
  Plus,
  Reply,
  Forward,
  MoreHorizontal,
  Paperclip,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  category: 'inquiry' | 'case_related' | 'appointment' | 'system' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
  relatedCaseId?: string;
  relatedArbitratorId?: string;
}

const mockMessages: Message[] = [
  {
    id: 'msg-001',
    from: '张明华',
    to: '当前用户',
    subject: '关于合同纠纷案件的咨询回复',
    content: '您好，关于您咨询的合同纠纷案件，我已经仔细审阅了相关材料。根据合同条款和相关法律规定，建议您...',
    timestamp: new Date('2024-02-14T10:30:00'),
    read: false,
    starred: true,
    category: 'case_related',
    priority: 'high',
    relatedArbitratorId: 'arb-001'
  },
  {
    id: 'msg-002',
    from: '系统通知',
    to: '当前用户',
    subject: '庭审时间确认通知',
    content: '您的案件ARB-2024-001已安排庭审时间，请于2024年2月15日上午9:00准时参加...',
    timestamp: new Date('2024-02-13T16:45:00'),
    read: true,
    starred: false,
    category: 'system',
    priority: 'urgent',
    relatedCaseId: 'case-001'
  }
];

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'starred' | 'archive'>('inbox');
  const [searchTerm, setSearchTerm] = useState('');

  // 新消息表单
  const [newMessage, setNewMessage] = useState({
    to: '',
    toName: '',
    subject: '',
    content: '',
    priority: 'medium' as Message['priority'],
    category: 'inquiry' as Message['category']
  });

  // 处理来自仲裁员库的消息数据
  useEffect(() => {
    if (action === 'compose') {
      const messageData = sessionStorage.getItem('newMessageData');
      if (messageData) {
        try {
          const data = JSON.parse(messageData);
          setNewMessage(prev => ({
            ...prev,
            to: data.recipientId,
            toName: data.recipientName,
            subject: data.subject || '',
            category: 'inquiry'
          }));
          setShowCompose(true);
          sessionStorage.removeItem('newMessageData');
        } catch (error) {
          console.error('解析消息数据失败:', error);
        }
      }
    }
  }, [action]);

  const handleSendMessage = () => {
    if (!newMessage.subject.trim() || !newMessage.content.trim()) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      from: '当前用户',
      to: newMessage.toName || newMessage.to,
      subject: newMessage.subject,
      content: newMessage.content,
      timestamp: new Date(),
      read: true,
      starred: false,
      category: newMessage.category,
      priority: newMessage.priority,
      relatedArbitratorId: newMessage.to.startsWith('arb-') ? newMessage.to : undefined
    };

    setMessages(prev => [message, ...prev]);
    setShowCompose(false);
    setNewMessage({
      to: '',
      toName: '',
      subject: '',
      content: '',
      priority: 'medium',
      category: 'inquiry'
    });
  };

  const filteredMessages = messages.filter(message => {
    const matchesTab = activeTab === 'inbox' ? true : 
                     activeTab === 'starred' ? message.starred :
                     activeTab === 'sent' ? message.from === '当前用户' :
                     false;
    
    const matchesSearch = searchTerm === '' || 
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const unreadCount = messages.filter(m => !m.read && m.from !== '当前用户').length;

  const getCategoryColor = (category: Message['category']) => {
    const colors = {
      inquiry: 'bg-blue-100 text-blue-800',
      case_related: 'bg-orange-100 text-orange-800',
      appointment: 'bg-green-100 text-green-800',
      system: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category];
  };

  const getCategoryLabel = (category: Message['category']) => {
    const labels = {
      inquiry: '咨询',
      case_related: '案件相关',
      appointment: '预约',
      system: '系统通知',
      other: '其他'
    };
    return labels[category];
  };

  const getPriorityIcon = (priority: Message['priority']) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">消息中心</h1>
          <p className="text-gray-600 mt-1">管理您的消息和通知</p>
        </div>
        <Button onClick={() => setShowCompose(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          写消息
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧边栏 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">消息分类</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={activeTab === 'inbox' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('inbox')}
              >
                <Inbox className="h-4 w-4 mr-2" />
                收件箱
                {unreadCount > 0 && (
                  <Badge className="ml-auto bg-red-500">{unreadCount}</Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'sent' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('sent')}
              >
                <Send className="h-4 w-4 mr-2" />
                已发送
              </Button>
              <Button
                variant={activeTab === 'starred' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('starred')}
              >
                <Star className="h-4 w-4 mr-2" />
                已加星标
              </Button>
              <Button
                variant={activeTab === 'archive' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('archive')}
              >
                <Archive className="h-4 w-4 mr-2" />
                归档
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {activeTab === 'inbox' ? '收件箱' : 
                   activeTab === 'sent' ? '已发送' :
                   activeTab === 'starred' ? '已加星标' : '归档'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="搜索消息..."
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无消息</h3>
                  <p className="text-gray-500">您的{activeTab === 'inbox' ? '收件箱' : '消息列表'}是空的</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        !message.read && message.from !== '当前用户' ? 'bg-blue-50 border-blue-200' : ''
                      } ${selectedMessage?.id === message.id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (!message.read) {
                          setMessages(prev => prev.map(m => 
                            m.id === message.id ? { ...m, read: true } : m
                          ));
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${!message.read && message.from !== '当前用户' ? 'text-gray-900' : 'text-gray-700'}`}>
                              {message.from}
                            </span>
                            <Badge variant="outline" className={getCategoryColor(message.category)}>
                              {getCategoryLabel(message.category)}
                            </Badge>
                            {getPriorityIcon(message.priority)}
                            {message.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                          </div>
                          <h4 className={`font-medium mb-1 ${!message.read && message.from !== '当前用户' ? 'text-gray-900' : 'text-gray-700'}`}>
                            {message.subject}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {message.content}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 ml-4">
                          {message.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 消息详情对话框 */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedMessage.subject}</span>
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(selectedMessage.category)}>
                    {getCategoryLabel(selectedMessage.category)}
                  </Badge>
                  {getPriorityIcon(selectedMessage.priority)}
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  <span className="font-medium">发件人：</span>{selectedMessage.from}
                </div>
                <div>
                  {selectedMessage.timestamp.toLocaleString()}
                </div>
              </div>
              <Separator />
              <div className="whitespace-pre-wrap text-gray-700">
                {selectedMessage.content}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedMessage(null)}>
                  关闭
                </Button>
                <Button>
                  <Reply className="h-4 w-4 mr-2" />
                  回复
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 写消息对话框 */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>写消息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="to">收件人</Label>
                <Input
                  id="to"
                  value={newMessage.toName || newMessage.to}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, toName: e.target.value }))}
                  placeholder="输入收件人姓名"
                />
              </div>
              <div>
                <Label htmlFor="category">消息类型</Label>
                <Select
                  value={newMessage.category}
                  onValueChange={(value: Message['category']) =>
                    setNewMessage(prev => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiry">咨询</SelectItem>
                    <SelectItem value="case_related">案件相关</SelectItem>
                    <SelectItem value="appointment">预约</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">主题</Label>
              <Input
                id="subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="输入消息主题"
              />
            </div>

            <div>
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                value={newMessage.content}
                onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入消息内容..."
                rows={6}
              />
            </div>

            <div>
              <Label htmlFor="priority">优先级</Label>
              <Select
                value={newMessage.priority}
                onValueChange={(value: Message['priority']) =>
                  setNewMessage(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                取消
              </Button>
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4 mr-2" />
                发送
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
