// src/components/schedule/reminder-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Clock, 
  Calendar, 
  Settings, 
  Plus, 
  X,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Mail,
  MessageSquare
} from 'lucide-react';

interface Reminder {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  reminderTime: number; // 提前分钟数
  type: 'notification' | 'email' | 'sms';
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

interface ReminderSettings {
  enabled: boolean;
  defaultTimes: number[]; // 默认提醒时间（分钟）
  types: {
    notification: boolean;
    email: boolean;
    sms: boolean;
  };
  workingHours: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

interface ReminderManagerProps {
  eventId?: string;
  onReminderUpdate?: (reminders: Reminder[]) => void;
}

export function ReminderManager({ eventId, onReminderUpdate }: ReminderManagerProps) {
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: 'r1',
      eventId: 'e1',
      eventTitle: '合同纠纷案首次开庭',
      eventDate: '2024-02-15',
      eventTime: '09:00',
      reminderTime: 15,
      type: 'notification',
      status: 'pending',
      createdAt: '2024-01-17'
    },
    {
      id: 'r2',
      eventId: 'e1',
      eventTitle: '合同纠纷案首次开庭',
      eventDate: '2024-02-15',
      eventTime: '09:00',
      reminderTime: 60,
      type: 'email',
      status: 'pending',
      createdAt: '2024-01-17'
    },
    {
      id: 'r3',
      eventId: 'e2',
      eventTitle: '劳动争议案调解会议',
      eventDate: '2024-02-16',
      eventTime: '14:00',
      reminderTime: 30,
      type: 'notification',
      status: 'sent',
      createdAt: '2024-01-17'
    }
  ]);

  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    defaultTimes: [15, 60, 1440], // 15分钟、1小时、1天前
    types: {
      notification: true,
      email: true,
      sms: false
    },
    workingHours: {
      start: '09:00',
      end: '18:00',
      enabled: true
    }
  });

  const [showSettings, setShowSettings] = useState(false);

  // 过滤当前事件的提醒
  const eventReminders = eventId 
    ? reminders.filter(r => r.eventId === eventId)
    : reminders;

  // 获取即将到来的提醒
  const upcomingReminders = reminders.filter(r => {
    const eventDateTime = new Date(`${r.eventDate} ${r.eventTime}`);
    const reminderTime = new Date(eventDateTime.getTime() - r.reminderTime * 60000);
    const now = new Date();
    return reminderTime > now && r.status === 'pending';
  }).sort((a, b) => {
    const aTime = new Date(`${a.eventDate} ${a.eventTime}`).getTime() - a.reminderTime * 60000;
    const bTime = new Date(`${b.eventDate} ${b.eventTime}`).getTime() - b.reminderTime * 60000;
    return aTime - bTime;
  });

  // 添加提醒
  const addReminder = (eventId: string, eventTitle: string, eventDate: string, eventTime: string, reminderTime: number, type: Reminder['type']) => {
    const newReminder: Reminder = {
      id: `r-${Date.now()}`,
      eventId,
      eventTitle,
      eventDate,
      eventTime,
      reminderTime,
      type,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setReminders(prev => [...prev, newReminder]);
    
    if (onReminderUpdate) {
      onReminderUpdate([...reminders, newReminder]);
    }
  };

  // 删除提醒
  const removeReminder = (reminderId: string) => {
    const updatedReminders = reminders.filter(r => r.id !== reminderId);
    setReminders(updatedReminders);
    
    if (onReminderUpdate) {
      onReminderUpdate(updatedReminders);
    }
  };

  // 格式化提醒时间
  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours}小时前`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}天前`;
    }
  };

  // 获取提醒类型图标
  const getReminderTypeIcon = (type: Reminder['type']) => {
    switch (type) {
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: Reminder['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: Reminder['status']) => {
    switch (status) {
      case 'pending': return '待发送';
      case 'sent': return '已发送';
      case 'failed': return '发送失败';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* 提醒概览 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            提醒管理
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {upcomingReminders.length} 个即将提醒
            </Badge>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>提醒设置</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* 全局开关 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">启用提醒</p>
                      <p className="text-sm text-gray-600">开启或关闭所有提醒功能</p>
                    </div>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  {/* 提醒类型 */}
                  <div className="space-y-3">
                    <p className="font-medium">提醒方式</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          <span className="text-sm">系统通知</span>
                        </div>
                        <Switch
                          checked={settings.types.notification}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            types: { ...prev.types, notification: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">邮件提醒</span>
                        </div>
                        <Switch
                          checked={settings.types.email}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            types: { ...prev.types, email: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">短信提醒</span>
                        </div>
                        <Switch
                          checked={settings.types.sms}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            types: { ...prev.types, sms: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 工作时间 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">工作时间限制</p>
                        <p className="text-sm text-gray-600">仅在工作时间内发送提醒</p>
                      </div>
                      <Switch
                        checked={settings.workingHours.enabled}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          workingHours: { ...prev.workingHours, enabled: checked }
                        }))}
                      />
                    </div>
                    
                    {settings.workingHours.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">开始时间</label>
                          <Select 
                            value={settings.workingHours.start}
                            onValueChange={(value) => setSettings(prev => ({
                              ...prev,
                              workingHours: { ...prev.workingHours, start: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                  {`${i.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">结束时间</label>
                          <Select 
                            value={settings.workingHours.end}
                            onValueChange={(value) => setSettings(prev => ({
                              ...prev,
                              workingHours: { ...prev.workingHours, end: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                  {`${i.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* 即将到来的提醒 */}
          {upcomingReminders.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">即将到来的提醒</h4>
              {upcomingReminders.slice(0, 3).map(reminder => {
                const eventDateTime = new Date(`${reminder.eventDate} ${reminder.eventTime}`);
                const reminderTime = new Date(eventDateTime.getTime() - reminder.reminderTime * 60000);
                
                return (
                  <div key={reminder.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getReminderTypeIcon(reminder.type)}
                      <div>
                        <p className="font-medium text-sm">{reminder.eventTitle}</p>
                        <p className="text-xs text-gray-600">
                          {formatReminderTime(reminder.reminderTime)} · {reminderTime.toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(reminder.status)}>
                      {getStatusText(reminder.status)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无即将到来的提醒</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 提醒列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>所有提醒</span>
            <Badge variant="outline">{eventReminders.length} 个提醒</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eventReminders.map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getReminderTypeIcon(reminder.type)}
                  <div>
                    <p className="font-medium text-sm">{reminder.eventTitle}</p>
                    <p className="text-xs text-gray-600">
                      {reminder.eventDate} {reminder.eventTime} · {formatReminderTime(reminder.reminderTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(reminder.status)}>
                    {getStatusText(reminder.status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReminder(reminder.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {eventReminders.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无提醒设置</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
