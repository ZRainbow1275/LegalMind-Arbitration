// src/components/schedule/event-creator.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Phone,
  Bell,
  Repeat,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface EventData {
  title: string;
  type: 'hearing' | 'mediation' | 'consultation' | 'meeting' | 'other';
  caseId?: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  meetingType: 'offline' | 'online' | 'phone';
  participants: string[];
  description: string;
  priority: 'low' | 'medium' | 'high';
  reminders: {
    enabled: boolean;
    times: number[]; // 提前分钟数
  };
  recurring: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
}

const isEventType = (value: string): value is EventData['type'] => {
  return value === 'hearing' || value === 'mediation' || value === 'consultation' || value === 'meeting' || value === 'other';
};

const isEventPriority = (value: string): value is EventData['priority'] => {
  return value === 'low' || value === 'medium' || value === 'high';
};

const isMeetingType = (value: string): value is EventData['meetingType'] => {
  return value === 'offline' || value === 'online' || value === 'phone';
};

const isRecurringPattern = (value: string): value is EventData['recurring']['pattern'] => {
  return value === 'daily' || value === 'weekly' || value === 'monthly';
};

interface EventCreatorProps {
  trigger?: React.ReactNode;
  onEventCreate?: (event: EventData) => void;
  defaultDate?: Date;
  defaultCaseId?: string;
}

export function EventCreator({ 
  trigger, 
  onEventCreate, 
  defaultDate,
  defaultCaseId 
}: EventCreatorProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<EventData>({
    title: '',
    type: 'meeting',
    caseId: defaultCaseId || '',
    date: defaultDate || new Date(),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    meetingType: 'offline',
    participants: [],
    description: '',
    priority: 'medium',
    reminders: {
      enabled: true,
      times: [15, 60] // 15分钟和1小时前提醒
    },
    recurring: {
      enabled: false,
      pattern: 'weekly'
    }
  });
  
  const [participantInput, setParticipantInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // 时间选项
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  // 添加参与者
  const addParticipant = () => {
    if (participantInput.trim() && !formData.participants.includes(participantInput.trim())) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput.trim()]
      }));
      setParticipantInput('');
    }
  };

  // 删除参与者
  const removeParticipant = (participant: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== participant)
    }));
  };

  // 表单验证
  const validateForm = () => {
    return formData.title.trim() !== '' && 
           formData.startTime !== '' && 
           formData.endTime !== '' &&
           formData.startTime < formData.endTime;
  };

  // 提交事件
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onEventCreate) {
        onEventCreate(formData);
      }
      
      setSubmitStatus('success');
      
      // 2秒后关闭对话框
      setTimeout(() => {
        setOpen(false);
        setSubmitStatus('idle');
        // 重置表单
        setFormData({
          title: '',
          type: 'meeting',
          caseId: defaultCaseId || '',
          date: defaultDate || new Date(),
          startTime: '09:00',
          endTime: '10:00',
          location: '',
          meetingType: 'offline',
          participants: [],
          description: '',
          priority: 'medium',
          reminders: {
            enabled: true,
            times: [15, 60]
          },
          recurring: {
            enabled: false,
            pattern: 'weekly'
          }
        });
      }, 2000);
      
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hearing': return '庭审';
      case 'mediation': return '调解';
      case 'consultation': return '咨询';
      case 'meeting': return '会议';
      case 'other': return '其他';
      default: return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            创建事件
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            创建日程事件
          </DialogTitle>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">事件创建成功</h3>
            <p className="text-gray-600">日程事件已添加到您的日历中。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">事件标题 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="请输入事件标题"
                    required
                  />
                </div>

                <div>
                  <Label>事件类型</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => {
                        if (!isEventType(value)) return;
                        setFormData(prev => ({ ...prev, type: value }));
                      }}
                    >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hearing">庭审</SelectItem>
                      <SelectItem value="mediation">调解</SelectItem>
                      <SelectItem value="consultation">咨询</SelectItem>
                      <SelectItem value="meeting">会议</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>关联案件</Label>
                  <Input
                    value={formData.caseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, caseId: e.target.value }))}
                    placeholder="输入案件编号（可选）"
                  />
                </div>

                <div>
                  <Label>优先级</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => {
                        if (!isEventPriority(value)) return;
                        setFormData(prev => ({ ...prev, priority: value }));
                      }}
                    >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低优先级</SelectItem>
                      <SelectItem value="medium">中等优先级</SelectItem>
                      <SelectItem value="high">高优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>日期</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.date, 'yyyy年MM月dd日', { locale: zhCN })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                        locale={zhCN}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>开始时间</Label>
                    <Select 
                      value={formData.startTime} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>结束时间</Label>
                    <Select 
                      value={formData.endTime} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>会议方式</Label>
                  <Select
                    value={formData.meetingType}
                    onValueChange={(value) => {
                      if (!isMeetingType(value)) return;
                      setFormData(prev => ({ ...prev, meetingType: value }));
                    }}
                    >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          线下会议
                        </div>
                      </SelectItem>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          在线会议
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          电话会议
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>地点/链接</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={
                      formData.meetingType === 'online' ? '输入会议链接' :
                      formData.meetingType === 'phone' ? '输入电话号码' :
                      '输入会议地点'
                    }
                  />
                </div>
              </div>
            </div>

            {/* 参与者 */}
            <div className="space-y-4">
              <Label>参与者</Label>
              <div className="flex gap-2">
                <Input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  placeholder="输入参与者姓名"
                  onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                />
                <Button type="button" onClick={addParticipant}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.participants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.participants.map((participant, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeParticipant(participant)}>
                      {participant} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 描述 */}
            <div>
              <Label>事件描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入事件的详细描述..."
                rows={3}
              />
            </div>

            {/* 提醒设置 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.reminders.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    reminders: { ...prev.reminders, enabled: checked }
                  }))}
                />
                <Label>启用提醒</Label>
              </div>
              
              {formData.reminders.enabled && (
                <div className="ml-6 space-y-2">
                  <p className="text-sm text-gray-600">提醒时间：</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">15分钟前</Badge>
                    <Badge variant="outline">1小时前</Badge>
                  </div>
                </div>
              )}
            </div>

            {/* 重复设置 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.recurring.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    recurring: { ...prev.recurring, enabled: checked }
                  }))}
                />
                <Label>重复事件</Label>
              </div>
              
              {formData.recurring.enabled && (
                <div className="ml-6">
                  <Select 
                    value={formData.recurring.pattern} 
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      recurring: { ...prev.recurring, pattern: isRecurringPattern(value) ? value : prev.recurring.pattern }
                    }))}
                    >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">每天</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 验证提示 */}
            {formData.startTime >= formData.endTime && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  结束时间必须晚于开始时间
                </AlertDescription>
              </Alert>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!validateForm() || isSubmitting}
              >
                {isSubmitting ? '创建中...' : '创建事件'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
