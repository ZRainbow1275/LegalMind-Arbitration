// src/components/arbitrator/appointment-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  User,
  Video,
  MapPin,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface AppointmentDialogProps {
  arbitratorName: string;
  arbitratorId: string;
  trigger?: React.ReactNode;
  onBook?: (appointment: AppointmentData) => void;
}

interface AppointmentData {
  arbitratorId: string;
  date: Date;
  timeSlot: string;
  duration: number; // 分钟
  type: 'online' | 'offline' | 'phone';
  purpose: string;
  description: string;
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
}

const appointmentTypes = ['online', 'offline', 'phone'] as const;

function isAppointmentType(value: string): value is AppointmentData['type'] {
  return (appointmentTypes as readonly string[]).includes(value);
}

// 可用时间段
const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

// 咨询时长选项
const durationOptions = [
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' },
  { value: 90, label: '1.5小时' },
  { value: 120, label: '2小时' }
];

export function AppointmentDialog({ 
  arbitratorName, 
  arbitratorId, 
  trigger,
  onBook 
}: AppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState<Partial<AppointmentData>>({
    arbitratorId,
    duration: 60,
    type: 'online',
    purpose: '',
    description: '',
    contactInfo: {
      name: '',
      phone: '',
      email: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!selectedDate || !formData.timeSlot || !formData.purpose || !formData.contactInfo?.name) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 模拟预约提交
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const appointmentData: AppointmentData = {
        ...formData,
        date: selectedDate,
      } as AppointmentData;
      
      if (onBook) {
        onBook(appointmentData);
      }
      
      setSubmitStatus('success');
      
      // 3秒后关闭对话框
      setTimeout(() => {
        setOpen(false);
        setSubmitStatus('idle');
        setSelectedDate(undefined);
        setFormData({
          arbitratorId,
          duration: 60,
          type: 'online',
          purpose: '',
          description: '',
          contactInfo: {
            name: '',
            phone: '',
            email: ''
          }
        });
      }, 3000);
      
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'online': return <Video className="w-4 h-4" />;
      case 'offline': return <MapPin className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'online': return '在线视频';
      case 'offline': return '线下面谈';
      case 'phone': return '电话咨询';
      default: return type;
    }
  };

  // 禁用过去的日期和周末
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = date.getDay();
    return date < today || day === 0 || day === 6; // 禁用周末
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="hover-lift">
            <CalendarIcon className="h-4 w-4 mr-2" />
            预约咨询
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            预约咨询 - {arbitratorName}
          </DialogTitle>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">预约申请已提交</h3>
            <p className="text-gray-600 mb-4">
              您的预约申请已发送给{arbitratorName}，对方会在24小时内确认预约时间。
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
              <h4 className="font-medium mb-2">预约详情</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>日期：{selectedDate && format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}</p>
                <p>时间：{formData.timeSlot}</p>
                <p>时长：{formData.duration}分钟</p>
                <p>方式：{getTypeLabel(formData.type || 'online')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 仲裁员信息 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium">{arbitratorName}</p>
                  <p className="text-sm text-gray-600">资深仲裁员 · 15年经验</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  <Clock className="w-3 h-3 mr-1" />
                  咨询费：500元/小时
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：日期和时间选择 */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">选择日期</label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={isDateDisabled}
                    locale={zhCN}
                    className="rounded-md border"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">选择时间</label>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map(time => (
                        <Button
                          key={time}
                          variant={formData.timeSlot === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, timeSlot: time }))}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧：咨询详情 */}
              <div className="space-y-4">
                {/* 咨询方式 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">咨询方式</label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: isAppointmentType(value) ? value : prev.type,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          在线视频咨询
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          电话咨询
                        </div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          线下面谈
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 咨询时长 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">咨询时长</label>
                  <Select 
                    value={formData.duration?.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {durationOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 咨询目的 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">咨询目的</label>
                  <Input
                    placeholder="请简要说明咨询目的"
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                </div>

                {/* 详细描述 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">详细描述</label>
                  <Textarea
                    placeholder="请详细描述您的问题或需要咨询的内容..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 联系信息 */}
            <div className="space-y-4">
              <h4 className="font-medium">联系信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">姓名 *</label>
                  <Input
                    placeholder="请输入您的姓名"
                    value={formData.contactInfo?.name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo!, name: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">手机号</label>
                  <Input
                    placeholder="请输入手机号"
                    value={formData.contactInfo?.phone}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo!, phone: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">邮箱</label>
                  <Input
                    placeholder="请输入邮箱"
                    value={formData.contactInfo?.email}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      contactInfo: { ...prev.contactInfo!, email: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                预约申请提交后，仲裁员会在24小时内确认。确认后将通过短信和邮件通知您具体的咨询安排。
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
                disabled={
                  !selectedDate || 
                  !formData.timeSlot || 
                  !formData.purpose || 
                  !formData.contactInfo?.name ||
                  isSubmitting
                }
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    提交中...
                  </div>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    提交预约
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
