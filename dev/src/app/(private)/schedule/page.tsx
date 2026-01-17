// dev/src/app/(private)/schedule/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  MapPin,
  Users,
  Video,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/error-boundary';
import { EventCreator, type EventData } from '@/components/schedule/event-creator';
import { ReminderManager } from '@/components/schedule/reminder-manager';
import { SwimLaneCalendar } from '@/components/schedule/swimlane-calendar';
import { EnhancedCalendar } from '@/components/schedule/enhanced-calendar'; 
import { useRole } from '@/components/layout/role-switcher';
import { useNotificationHelpers } from '@/components/ui/notification';      
import { clientLogger } from '@/lib/client-logger';

// 用于生成唯一ID的计数器，避免hydration mismatch
let eventIdCounter = 0;
const generateEventId = () => `event-${++eventIdCounter}`;
const generateConsultationId = () => `consultation-${++eventIdCounter}`;

// 模拟日程数据 - 使用动态日期
const getTodayString = () => new Date().toISOString().split('T')[0];
const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};
const getAfterTomorrowString = () => {
  const afterTomorrow = new Date();
  afterTomorrow.setDate(afterTomorrow.getDate() + 2);
  return afterTomorrow.toISOString().split('T')[0];
};

type MeetingType = 'online' | 'offline';

type ScheduleEvent = {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  status: string;
  priority: string;
  meetingType: MeetingType;
  participants: string[];
  location?: string;
  description?: string;
  caseId?: string;
  caseTitle?: string;
  mediationId?: string;
  arbitratorId?: string;
  fee?: number;
};

const isMeetingType = (value: string): value is MeetingType => {
  return value === 'online' || value === 'offline';
};

const mockEvents: ScheduleEvent[] = [
  {
    id: '1',
    title: '合同纠纷案首次开庭',
    type: '开庭',
    caseId: 'CASE-2024-001',
    caseTitle: '合同纠纷案',
    date: getTodayString(), // 今天
    time: '09:00-11:00',
    location: '仲裁庭A',
    participants: ['张律师', '李律师', '王仲裁员'],
    status: '已确认',
    priority: '高',
    description: '案件首次开庭审理，双方当事人及代理人需准时到场',
    meetingType: 'offline'
  },
  {
    id: '2',
    title: '劳动争议案调解会议',
    type: '调解',
    caseId: 'CASE-2024-002',
    caseTitle: '劳动争议案',
    date: getTodayString(), // 今天
    time: '14:00-16:00',
    location: '调解室B',
    participants: ['陈律师', '赵调解员'],
    status: '待确认',
    priority: '中',
    description: '尝试通过调解方式解决争议',
    meetingType: 'offline'
  },
  {
    id: '3',
    title: '投资争议案证据交换',
    type: '证据交换',
    caseId: 'CASE-2024-003',
    caseTitle: '投资争议案',
    date: getTomorrowString(), // 明天
    time: '10:00-12:00',
    location: '线上会议',
    participants: ['孙律师', '周律师', '吴仲裁员'],
    status: '已确认',
    priority: '中',
    description: '双方交换证据材料，确定争议焦点',
    meetingType: 'online'
  },
  {
    id: '4',
    title: '知识产权案专家咨询',
    type: '咨询',
    caseId: 'CASE-2024-004',
    caseTitle: '知识产权案',
    date: getAfterTomorrowString(), // 后天
    time: '15:30-17:00',
    location: '会议室C',
    participants: ['专家A', '专家B', '项目组'],
    status: '已确认',
    priority: '高',
    description: '邀请技术专家对专利争议进行分析',
    meetingType: 'offline'
  },
    {
      id: '5',
      title: '案件进度汇报会',
      type: '会议',
      caseId: '',
      caseTitle: '多个案件',
      date: getAfterTomorrowString(), // 后天
      time: '09:30-10:30',
      location: '大会议室',
      participants: ['全体仲裁员', '秘书处'],
      status: '已确认',
      priority: '中',
      description: '月度案件进度汇报和工作安排',
      meetingType: 'offline'
    },
  {
    id: '6',
    title: '仲裁员培训会议',
    type: '会议',
    caseId: '',
    caseTitle: '',
    date: getTodayString(), // 今天
    time: '16:00-17:30',
    location: '培训室',
    participants: ['新任仲裁员', '培训讲师'],
    status: '已确认',
    priority: '中',
    description: '新任仲裁员业务培训',
    meetingType: 'offline'
  },
  {
    id: '7',
    title: '案件材料审查',
    type: '审查',
    caseId: 'CASE-2024-005',
    caseTitle: '建设工程案',
    date: getTodayString(), // 今天
    time: '11:00-12:00',
    location: '审查室',
    participants: ['主审仲裁员', '书记员'],
    status: '进行中',
    priority: '高',
    description: '审查新提交的案件材料',
    meetingType: 'offline'
  },
];

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function toICSDate(dateStr: string, timeRange?: string) {
  const [y,m,d] = dateStr.split('-').map(Number);
  let hh = 9, mm = 0;
  if (timeRange && timeRange.includes('-')) {
    const start = timeRange.split('-')[0]?.trim();
    if (start) { const [sh, sm] = start.split(':').map(Number); if(!isNaN(sh)) { hh = sh; mm = sm||0; } }
  }
  const dt = new Date(y, (m||1)-1, d||1, hh, mm, 0);
  const pad = (n:number)=> String(n).padStart(2,'0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
}
  function exportEventsToICS(list: ScheduleEvent[], filename = 'schedule.ics') {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LegalMind//Schedule//CN'
  ];
  list.forEach((e, index) => {
    const uid = `${e.id || `temp-${index}`}@legalmind`;
    const dtstart = toICSDate(e.date, e.time);
    const dtend = toICSDate(e.date, e.time);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toICSDate(new Date().toISOString().slice(0,10))}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`SUMMARY:${e.title}`);
    if(e.location) lines.push(`LOCATION:${e.location}`);
    if(e.description) lines.push(`DESCRIPTION:${e.description}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  downloadText(filename, lines.join('\r\n'));
}


export default function SchedulePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentRole } = useRole();
  const action = searchParams.get('action');
  const notify = useNotificationHelpers();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('enhanced');
  const [showEventCreator, setShowEventCreator] = useState(false);
  const [createEventData, setCreateEventData] = useState<{date: string, lane: string} | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>(() => [...mockEvents]);
  const [typeFilter, setTypeFilter] = useState('all');

  // 设置初始日期，避免hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // 处理来自仲裁员库的预约咨询数据
  useEffect(() => {
    if (action === 'book-consultation') {
      const consultationData = sessionStorage.getItem('newConsultationData');
      if (consultationData) {
        try {
          const data = JSON.parse(consultationData);

          // 创建预约咨询事件
          const consultationEvent: ScheduleEvent = {
            id: generateConsultationId(),
            title: data.title || `与${data.arbitratorName}的咨询预约`,
            type: '咨询',
            date: getTodayString(), // 今天的日期
            time: '14:00-15:00', // 默认时间
            location: '在线咨询',
            participants: [data.arbitratorName, '当前用户'],
            status: '待确认',
            priority: '中',
            description: data.description || `预约咨询仲裁员${data.arbitratorName}`,
            meetingType: 'online',
            arbitratorId: data.arbitratorId,
            fee: data.fee,
          };

          // 添加到事件列表
          setEvents(prev => [consultationEvent, ...prev]);

          // 切换到今日日程标签页
          setActiveTab('today');

          // 清除sessionStorage数据
          sessionStorage.removeItem('newConsultationData');

          // 显示成功提示
          clientLogger.info('预约咨询已创建', consultationEvent);
        } catch (error) {
          clientLogger.error('解析预约咨询数据失败', error);
        }
      }
    }
  }, [action]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [meetingFilter, setMeetingFilter] = useState('all');

  // URL -> state 初始化
  useEffect(() => {
    const t = searchParams.get('tab') || 'swimlane';
    if (t !== activeTab) setActiveTab(t);
  }, [searchParams, activeTab]);

  // state -> URL 同步
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'swimlane') params.set('tab', activeTab);
    router.replace(`/schedule${params.toString() ? `?${params}` : ''}`);
  }, [activeTab, router]);

  // 事件处理函数
  const handleEventClick = (event: ScheduleEvent) => {
    if (event.caseId) {
      router.push(`/cases/${event.caseId}`);
    } else if (event.mediationId) {
      router.push(`/mediation/${event.mediationId}`);
    } else {
      notify.info(`查看事件详情: ${event.title}`);
    }
  };

  const handleCreateEvent = (date: string, lane: string) => {
    setCreateEventData({ date, lane });
    setShowEventCreator(true);
  };

  const handleEventCreated = (newEvent: EventData) => {
    const date = newEvent.date.toISOString().split('T')[0];
    const time = `${newEvent.startTime}-${newEvent.endTime}`;

    const typeMap: Record<EventData['type'], ScheduleEvent['type']> = {
      hearing: '开庭',
      mediation: '调解',
      consultation: '咨询',
      meeting: '会议',
      other: '其他',
    };

    const priorityMap: Record<EventData['priority'], ScheduleEvent['priority']> = {
      low: '低',
      medium: '中',
      high: '高',
    };

    const scheduleEvent: ScheduleEvent = {
      id: generateEventId(),
      title: newEvent.title,
      type: typeMap[newEvent.type],
      date,
      time,
      status: '待确认',
      priority: priorityMap[newEvent.priority],
      meetingType: newEvent.meetingType === 'offline' ? 'offline' : 'online',
      participants: newEvent.participants,
      location: newEvent.location,
      description: newEvent.description,
      caseId: newEvent.caseId ? newEvent.caseId : undefined,
    };

    setEvents((prev) => [scheduleEvent, ...prev]);
    setShowEventCreator(false);
    setCreateEventData(null);
  };

  const todayEvents = useMemo(() =>
    events.filter(event => event.date === getTodayString()),
    [events]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return events.filter(event => new Date(event.date) > today).slice(0, 5);
  }, [events]);

  function matchFilters(event: ScheduleEvent) {
    const typeOk = typeFilter === 'all' || event.type === typeFilter;
    const statusOk = statusFilter === 'all' || event.status === statusFilter;
    const meetingOk = meetingFilter === 'all' || event.meetingType === meetingFilter;
    return typeOk && statusOk && meetingOk;
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case '开庭': return 'bg-red-100 text-red-800';
      case '调解': return 'bg-blue-100 text-blue-800';
      case '证据交换': return 'bg-green-100 text-green-800';
      case '咨询': return 'bg-purple-100 text-purple-800';
      case '会议': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已确认': return 'bg-green-100 text-green-800';
      case '待确认': return 'bg-yellow-100 text-yellow-800';
      case '已取消': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'text-red-600';
      case '中': return 'text-yellow-600';
      case '低': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">日程管理</h1>
          <p className="text-gray-600 mt-1">管理和安排所有仲裁相关活动</p>
        </div>
        <NewEventDialog events={events} setEvents={setEvents} />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日日程</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEvents.length}</div>
            <p className="text-xs text-muted-foreground">个活动安排</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本周开庭</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {events.filter(e => e.type === '开庭').length}
            </div>
            <p className="text-xs text-muted-foreground">场庭审</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待确认</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {events.filter(e => e.status === '待确认').length}
            </div>
            <p className="text-xs text-muted-foreground">需要确认</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">线上会议</CardTitle>
            <Video className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {events.filter(e => e.meetingType === 'online').length}
            </div>
            <p className="text-xs text-muted-foreground">个线上活动</p>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 日历 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>日历</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* 日程列表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>日程安排</CardTitle>
            <CardDescription>查看和管理所有日程活动</CardDescription>

	              {/* 操作按钮 */}
	              <div className="flex items-center justify-end gap-2">
	                <EventCreator
	                  onEventCreate={(event) => {
                    clientLogger.info('新建事件', event);
	                    // 这里可以集成实际的事件创建逻辑
	                  }}
	                  trigger={
	                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
	                      <Plus className="h-4 w-4 mr-2" />
	                      新建日程
	                    </Button>
	                  }
	                />
	                <Button variant="outline" size="sm" onClick={()=> exportEventsToICS(events.filter(matchFilters))}>
	                  <Download className="h-4 w-4 mr-2" />导出 ICS
	                </Button>
	              </div>

          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="enhanced">增强日程</TabsTrigger>
                <TabsTrigger value="swimlane">泳道视图</TabsTrigger>
                <TabsTrigger value="calendar">日历视图</TabsTrigger>
                <TabsTrigger value="today">今日日程</TabsTrigger>
                <TabsTrigger value="upcoming">即将到来</TabsTrigger>
                <TabsTrigger value="reminders">提醒管理</TabsTrigger>
              </TabsList>

              {/* 增强日程标签页 */}
              <TabsContent value="enhanced" className="space-y-4">
                <EnhancedCalendar
                  events={mockEvents.map(event => ({
                    id: event.id,
                    title: event.title,
                    type: event.type === '开庭' ? 'hearing' as const :
                          event.type === '调解' ? 'mediation' as const :
                          event.type === '会议' ? 'meeting' as const : 'other' as const,
                    startTime: new Date(`${event.date}T${event.time.split('-')[0]}:00`),
                    endTime: new Date(`${event.date}T${event.time.split('-')[1]}:00`),
                    location: event.location,
                    participants: event.participants,
                    description: event.description,
                      status: event.status === '进行中' ? 'in-progress' as const : 'scheduled' as const,
                    priority: event.priority === '高' ? 'high' as const :
                             event.priority === '中' ? 'medium' as const : 'low' as const,
                      caseId: event.caseId || undefined,
                    reminders: [30, 15],
                    isOnline: event.meetingType === 'online'
                  }))}
                  onEventCreate={(event) => {
                    clientLogger.info('创建新事件', event);
                  }}
                  onEventUpdate={(eventId, updates) => {
                    clientLogger.info('更新事件', { eventId, updates });
                  }}
                  onEventDelete={(eventId) => {
                    clientLogger.info('删除事件', { eventId });
                  }}
                />
              </TabsContent>

              {/* 泳道视图标签页 */}
                <TabsContent value="swimlane" className="space-y-4">      
                  <SwimLaneCalendar
                    events={events.filter(matchFilters).map((event) => ({
                      ...event,
                      location: event.location ?? '待确定',
                      description: event.description ?? ''
                    }))}
                    onEventClick={handleEventClick}
                    onCreateEvent={handleCreateEvent}
                  />
                </TabsContent>

              <TabsContent value="calendar" className="space-y-4">
                {(() => {
                  // 按日期分组事件
                  const eventsByDate = events.filter(matchFilters).reduce((acc, event) => {
                    const date = event.date;
                    if (!acc[date]) {
                      acc[date] = [];
                    }
                    acc[date].push(event);
                    return acc;
                  }, {} as Record<string, ScheduleEvent[]>);

                  // 按日期排序并对每日事件按时间排序
                  const sortedDates = Object.keys(eventsByDate).sort();

                  return (
                    <div className="space-y-6">
                      {sortedDates.map(date => {
                        const dayEvents = eventsByDate[date].sort((a, b) => {
                          const timeA = a.time.replace(':', '');
                          const timeB = b.time.replace(':', '');
                          return timeA.localeCompare(timeB);
                        });

                        const dateObj = new Date(date);
                        const isToday = date === getTodayString();

                        return (
                          <div key={date} className="space-y-3">
                            {/* 日期标题 */}
                            <div className={`flex items-center gap-3 pb-2 border-b ${isToday ? 'border-blue-200' : 'border-gray-200'}`}>
                              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                                isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <div className="text-center">
                                  <div className="text-lg font-bold">{dateObj.getDate()}</div>
                                  <div className="text-xs">{dateObj.toLocaleDateString('zh-CN', { month: 'short' })}</div>
                                </div>
                              </div>
                              <div>
                                <h3 className={`font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                                  {dateObj.toLocaleDateString('zh-CN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'long'
                                  })}
                                  {isToday && <span className="ml-2 text-sm">(今天)</span>}
                                </h3>
                                <p className="text-sm text-gray-500">{dayEvents.length} 个事件</p>
                              </div>
                            </div>

                            {/* 当日事件列表 */}
                            <div className="space-y-2 ml-4">
                              {dayEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-start gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={() => handleEventClick(event)}
                                >
                                  <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg">
                                    <div className="text-center">
                                      <div className="text-sm font-bold text-gray-900">{event.time}</div>
                                      <div className="text-xs text-gray-500">
                                        {event.meetingType === 'online' ? '线上' : '线下'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                                        <p className="text-sm text-gray-600">{event.caseTitle}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={getEventTypeColor(event.type)}>
                                          {event.type}
                                        </Badge>
                                        <Badge className={getStatusColor(event.status)}>
                                          {event.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <div className="flex items-center gap-1">
                                        {event.meetingType === 'online' ? (
                                          <Video className="h-4 w-4" />
                                        ) : (
                                          <MapPin className="h-4 w-4" />
                                        )}
                                        {event.location}
                                      </div>
                                      <div className={`flex items-center gap-1 ${getPriorityColor(event.priority)}`}>
                                        <AlertCircle className="h-4 w-4" />
                                        {event.priority}优先级
                                      </div>
                                      {event.participants && (
                                        <div className="flex items-center gap-1">
                                          <Users className="h-4 w-4" />
                                          {event.participants.length} 人参与
                                        </div>
                                      )}
                                    </div>

                                    {event.description && (
                                      <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {sortedDates.length === 0 && (
                        <div className="text-center py-12">
                          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无日程安排</h3>
                          <p className="text-gray-500">点击上方按钮创建新的日程安排</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="today" className="space-y-4">
                {todayEvents.filter(matchFilters).length > 0 ? (
                  <div className="space-y-4">
                    {todayEvents.filter(matchFilters).map((event) => (
                      <div key={event.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{event.title}</h3>
                          <Badge className={getEventTypeColor(event.type)}>
                            {event.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{event.time}</span>
                          <span>{event.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="今日无安排" description="今天没有安排任何活动" />
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingEvents.filter(matchFilters).length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.filter(matchFilters).map((event) => (
                      <div key={event.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{event.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={getEventTypeColor(event.type)}>
                              {event.type}
                            </Badge>
                            <Badge className={getStatusColor(event.status)}>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span>{formatDate(event.date)}</span>
                          <span>{event.time}</span>
                          <span>{event.location}</span>
                        </div>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="暂无即将到来的活动" description="近期没有安排" />
                )}
              </TabsContent>

              <TabsContent value="reminders" className="space-y-4">
                <ReminderManager
                  onReminderUpdate={(reminders) => {
                    clientLogger.info('提醒更新', reminders);
                    // 这里可以集成实际的提醒更新逻辑
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 事件创建对话框 */}
      <Dialog open={showEventCreator} onOpenChange={setShowEventCreator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建新事件</DialogTitle>
            <DialogDescription>
              {createEventData && `在 ${createEventData.date} 创建新的${
                createEventData.lane === 'arbitration' ? '仲裁庭审' :
                createEventData.lane === 'mediation' ? '调解会议' :
                createEventData.lane === 'consultation' ? '咨询会议' :
                createEventData.lane === 'document' ? '文档审查' : '其他事项'
              }事件`}
            </DialogDescription>
          </DialogHeader>
          {createEventData && (
            <EventCreator
              defaultDate={new Date(createEventData.date)}
              onEventCreate={handleEventCreated}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEventCreator(false);
              setCreateEventData(null);
            }}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 新建日程对话框组件
function NewEventDialog({ events, setEvents }: { events: ScheduleEvent[], setEvents: Dispatch<SetStateAction<ScheduleEvent[]>> }) {
  const notify = useNotificationHelpers();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    priority: string;
    meetingType: MeetingType;
    participants: string;
  }>({
    title: '',
    type: '会议',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
    priority: '中',
    meetingType: 'offline',
    participants: ''
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      notify.error('请填写完整信息');
      return;
    }

    const newEvent = {
      id: generateEventId(),
      title: formData.title,
      type: formData.type,
      caseId: '',
      caseTitle: '临时安排',
      date: formData.date,
      time: `${formData.startTime}-${formData.endTime}`,
      location: formData.location || '未设置',
      participants: formData.participants ? formData.participants.split(',').map(p => p.trim()) : [],
      status: '待确认',
      priority: formData.priority,
      description: formData.description,
      meetingType: formData.meetingType
    };

    setEvents([newEvent, ...events]);
    setIsOpen(false);

    // 重置表单
    setFormData({
      title: '',
      type: '会议',
      date: '',
      startTime: '',
      endTime: '',
      location: '',
      description: '',
      priority: '中',
      meetingType: 'offline',
      participants: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新建日程
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">新建日程</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">活动标题 *</label>
              <Input
                placeholder="如：合同纠纷案首次开庭"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">活动类型 *</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="开庭">开庭</SelectItem>
                  <SelectItem value="调解">调解</SelectItem>
                  <SelectItem value="证据交换">证据交换</SelectItem>
                  <SelectItem value="咨询">咨询</SelectItem>
                  <SelectItem value="会议">会议</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="高">高优先级</SelectItem>
                  <SelectItem value="中">中优先级</SelectItem>
                  <SelectItem value="低">低优先级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 时间安排 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日期 *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始时间 *</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束时间 *</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          {/* 地点和方式 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">会议方式</label>
                <Select value={formData.meetingType} onValueChange={(value) => {
                  if (!isMeetingType(value)) return;
                  setFormData({ ...formData, meetingType: value });
                }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">线下会议</SelectItem>
                  <SelectItem value="online">线上会议</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">地点</label>
              <Input
                placeholder={formData.meetingType === 'online' ? '线上会议室链接' : '会议室或地址'}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          {/* 参与人员 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">参与人员</label>
            <Input
              placeholder="请输入参与人员，用逗号分隔"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">活动描述</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
              placeholder="请描述活动的具体内容和要求..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            * 为必填项
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              创建日程
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
