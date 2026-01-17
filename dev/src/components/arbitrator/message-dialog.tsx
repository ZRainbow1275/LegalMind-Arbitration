// src/components/arbitrator/message-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  AlertTriangle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';

interface MessageDialogProps {
  arbitratorName: string;
  arbitratorId: string;
  trigger?: React.ReactNode;
  onSend?: (message: MessageData) => void;
}

interface MessageData {
  to: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  category: 'inquiry' | 'case_related' | 'appointment' | 'other';
  attachments?: File[];
}

const isMessageCategory = (value: string): value is MessageData['category'] => {
  return value === 'inquiry' || value === 'case_related' || value === 'appointment' || value === 'other';
};

const isMessagePriority = (value: string): value is MessageData['priority'] => {
  return value === 'low' || value === 'medium' || value === 'high';
};

export function MessageDialog({ 
  arbitratorName, 
  arbitratorId, 
  trigger,
  onSend 
}: MessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<MessageData>({
    to: arbitratorId,
    subject: '',
    content: '',
    priority: 'medium',
    category: 'inquiry'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.content.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 模拟发送消息
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSend) {
        onSend(formData);
      }
      
      setSubmitStatus('success');
      
      // 2秒后关闭对话框
      setTimeout(() => {
        setOpen(false);
        setSubmitStatus('idle');
        setFormData({
          to: arbitratorId,
          subject: '',
          content: '',
          priority: 'medium',
          category: 'inquiry'
        });
      }, 2000);
      
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'inquiry': return '一般咨询';
      case 'case_related': return '案件相关';
      case 'appointment': return '预约申请';
      case 'other': return '其他';
      default: return category;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="hover-lift">
            <MessageSquare className="h-4 w-4 mr-2" />
            发送消息
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            发送消息给 {arbitratorName}
          </DialogTitle>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">消息发送成功</h3>
            <p className="text-gray-600">您的消息已发送给{arbitratorName}，对方会尽快回复。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 收件人信息 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium">{arbitratorName}</p>
                  <p className="text-sm text-gray-600">资深仲裁员</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  <Clock className="w-3 h-3 mr-1" />
                  通常24小时内回复
                </Badge>
              </div>
            </div>

            {/* 消息分类和优先级 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">消息类型</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      if (!isMessageCategory(value)) return;
                      setFormData(prev => ({ ...prev, category: value }));
                    }}
                  >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiry">一般咨询</SelectItem>
                    <SelectItem value="case_related">案件相关</SelectItem>
                    <SelectItem value="appointment">预约申请</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">优先级</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => {
                      if (!isMessagePriority(value)) return;
                      setFormData(prev => ({ ...prev, priority: value }));
                    }}
                  >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        低优先级
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        中等优先级
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        高优先级
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 主题 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">主题</label>
              <Input
                placeholder="请输入消息主题"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            {/* 消息内容 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">消息内容</label>
              <Textarea
                placeholder="请输入您要发送的消息内容..."
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
              />
              <p className="text-xs text-gray-500">
                请详细描述您的问题或需求，以便仲裁员更好地为您提供帮助。
              </p>
            </div>

            {/* 提示信息 */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                发送的消息将通过平台安全通道传递，请确保内容准确无误。仲裁员会根据消息优先级和类型安排回复时间。
              </AlertDescription>
            </Alert>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.subject.trim() || !formData.content.trim() || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    发送中...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    发送消息
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
