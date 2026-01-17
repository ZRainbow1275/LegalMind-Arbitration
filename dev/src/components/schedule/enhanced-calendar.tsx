// dev/src/components/schedule/enhanced-calendar.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  BarChart3,
  Users,
  MapPin,
  Bell,
  Video,
  FileText,
  Scale,
  MessageSquare
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'hearing' | 'mediation' | 'meeting' | 'deadline' | 'consultation' | 'other';
  startTime: Date;
  endTime: Date;
  location?: string;
  participants: string[];
  description?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  caseId?: string;
  reminders: number[]; // 提前多少分钟提醒
  isOnline: boolean;
  meetingLink?: string;
}

interface EnhancedCalendarProps {
  events: CalendarEvent[];
  onEventCreate?: (event: Omit<CalendarEvent, 'id'>) => void;
  onEventUpdate?: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onEventDelete?: (eventId: string) => void;
  className?: string;
}

type ViewMode = 'month' | 'week' | 'day' | 'list' | 'swimlane' | 'timeline';

const mockEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: '案件ARB-2024-001庭审',
    type: 'hearing',
    startTime: new Date('2024-02-15T09:00:00'),
    endTime: new Date('2024-02-15T11:00:00'),
    location: '第一庭审室',
    participants: ['张三', '李四', '仲裁员王某'],
    status: 'scheduled',
    priority: 'high',
    caseId: 'case-001',
    reminders: [30, 15],
    isOnline: false
  },
  {
    id: 'event-2',
    title: '调解案件MED-2024-001',
    type: 'mediation',
    startTime: new Date('2024-02-16T14:00:00'),
    endTime: new Date('2024-02-16T16:00:00'),
    location: '调解室A',
    participants: ['申请人', '被申请人', '调解员'],
    status: 'scheduled',
    priority: 'medium',
    caseId: 'med-001',
    reminders: [60, 30],
    isOnline: true,
    meetingLink: 'https://meet.example.com/med-001'
  },
  {
    id: 'event-3',
    title: '仲裁员会议',
    type: 'meeting',
    startTime: new Date('2024-02-17T10:00:00'),
    endTime: new Date('2024-02-17T12:00:00'),
    location: '会议室B',
    participants: ['仲裁员A', '仲裁员B', '仲裁员C'],
    status: 'scheduled',
    priority: 'medium',
    reminders: [15],
    isOnline: false
  },
  {
    id: 'event-4',
    title: '案件材料提交截止',
    type: 'deadline',
    startTime: new Date('2024-02-18T17:00:00'),
    endTime: new Date('2024-02-18T17:00:00'),
    participants: ['申请人'],
    status: 'scheduled',
    priority: 'urgent',
    caseId: 'case-002',
    reminders: [1440, 60], // 1天前和1小时前
    isOnline: false
  }
];

export function EnhancedCalendar({ 
  events = mockEvents, 
  onEventCreate, 
  onEventUpdate, 
  onEventDelete,
  className 
}: EnhancedCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'meeting' as CalendarEvent['type'],
    startTime: '',
    endTime: '',
    location: '',
    participants: '',
    description: '',
    priority: 'medium' as CalendarEvent['priority'],
    isOnline: false,
    meetingLink: '',
    reminders: [30]
  });

  const filteredEvents = events.filter(event => {
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    const colors = {
      hearing: 'bg-orange-100 text-orange-800 border-orange-200',
      mediation: 'bg-green-100 text-green-800 border-green-200',
      meeting: 'bg-blue-100 text-blue-800 border-blue-200',
      deadline: 'bg-red-100 text-red-800 border-red-200',
      consultation: 'bg-purple-100 text-purple-800 border-purple-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type];
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    const icons = {
      hearing: <Scale className="h-4 w-4" />,
      mediation: <MessageSquare className="h-4 w-4" />,
      meeting: <Users className="h-4 w-4" />,
      deadline: <Clock className="h-4 w-4" />,
      consultation: <FileText className="h-4 w-4" />,
      other: <Calendar className="h-4 w-4" />
    };
    return icons[type];
  };

  const getEventTypeLabel = (type: CalendarEvent['type']) => {
    const labels = {
      hearing: '庭审',
      mediation: '调解',
      meeting: '会议',
      deadline: '截止时间',
      consultation: '咨询',
      other: '其他'
    };
    return labels[type];
  };

  const getPriorityColor = (priority: CalendarEvent['priority']) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };
    return colors[priority];
  };

  const getPriorityLabel = (priority: CalendarEvent['priority']) => {
    const labels = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急'
    };
    return labels[priority];
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;

    const event: Omit<CalendarEvent, 'id'> = {
      title: newEvent.title,
      type: newEvent.type,
      startTime: new Date(newEvent.startTime),
      endTime: new Date(newEvent.endTime),
      location: newEvent.location,
      participants: newEvent.participants.split(',').map(p => p.trim()).filter(p => p),
      description: newEvent.description,
      status: 'scheduled',
      priority: newEvent.priority,
      reminders: newEvent.reminders,
      isOnline: newEvent.isOnline,
      meetingLink: newEvent.isOnline ? newEvent.meetingLink : undefined
    };

    onEventCreate?.(event);
    setShowCreateDialog(false);
    setNewEvent({
      title: '',
      type: 'meeting',
      startTime: '',
      endTime: '',
      location: '',
      participants: '',
      description: '',
      priority: 'medium',
      isOnline: false,
      meetingLink: '',
      reminders: [30]
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getViewModeIcon = (mode: ViewMode) => {
    const icons = {
      month: <Grid3X3 className="h-4 w-4" />,
      week: <BarChart3 className="h-4 w-4" />,
      day: <Calendar className="h-4 w-4" />,
      list: <List className="h-4 w-4" />,
      swimlane: <Users className="h-4 w-4" />,
      timeline: <Clock className="h-4 w-4" />
    };
    return icons[mode];
  };

  const getViewModeLabel = (mode: ViewMode) => {
    const labels = {
      month: '月视图',
      week: '周视图',
      day: '日视图',
      list: '列表视图',
      swimlane: '泳道视图',
      timeline: '时间轴'
    };
    return labels[mode];
  };

  const renderListView = () => {
    // 按时间排序事件
    const sortedEvents = [...filteredEvents].sort((a, b) =>
      a.startTime.getTime() - b.startTime.getTime()
    );

    return (
      <div className="space-y-4">
        {sortedEvents.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEvent(event)}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${getEventTypeColor(event.type)}`}>
                  {getEventTypeIcon(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge variant="outline" className={getPriorityColor(event.priority)}>
                      {getPriorityLabel(event.priority)}
                    </Badge>
                    {event.isOnline && (
                      <Badge variant="outline" className="text-blue-600">
                        <Video className="h-3 w-3 mr-1" />
                        在线
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(event.startTime)} {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.participants.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
              <Badge className={getEventTypeColor(event.type)}>
                {getEventTypeLabel(event.type)}
              </Badge>
            </div>
          </CardContent>
        </Card>
        ))}
      </div>
    );
  };

  const renderSwimlaneView = () => {
    // 按时间段分组事件（以小时为单位）
    const timeSlots = new Map<string, CalendarEvent[]>();

    // 生成今天的时间段（8:00-18:00）
    const today = new Date();
    const startHour = 8;
    const endHour = 18;

    for (let hour = startHour; hour <= endHour; hour++) {
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;
      timeSlots.set(timeKey, []);
    }

    // 将事件分配到对应的时间段
    filteredEvents.forEach(event => {
      const eventHour = event.startTime.getHours();
      if (eventHour >= startHour && eventHour <= endHour) {
        const timeKey = `${eventHour.toString().padStart(2, '0')}:00`;
        if (timeSlots.has(timeKey)) {
          timeSlots.get(timeKey)!.push(event);
        }
      }
    });

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          按时间段显示今日事件安排（{today.toLocaleDateString()}）
        </div>
        {Array.from(timeSlots.entries()).map(([timeSlot, timeEvents]) => (
          <Card key={timeSlot} className={timeEvents.length > 0 ? 'border-blue-200' : 'border-gray-100'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {timeSlot} - {(parseInt(timeSlot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                </div>
                <Badge variant="outline" className={timeEvents.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'}>
                  {timeEvents.length}个事件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeEvents.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <Clock className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">此时段暂无安排</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeEvents.map((event) => (
                    <div key={event.id}
                         className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all duration-200 hover:scale-[1.01] ${getEventTypeColor(event.type)}`}
                         onClick={() => setSelectedEvent(event)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${getEventTypeColor(event.type)}`}>
                            {getEventTypeIcon(event.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{event.title}</span>
                              <Badge variant="outline" className={getPriorityColor(event.priority)}>
                                {getPriorityLabel(event.priority)}
                              </Badge>
                              {event.isOnline && (
                                <Badge variant="outline" className="text-blue-600">
                                  <Video className="h-3 w-3 mr-1" />
                                  在线
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.participants.join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge className={getEventTypeColor(event.type)}>
                          {getEventTypeLabel(event.type)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderTimelineView = () => {
    // 按日期分组事件
    const eventsByDate = new Map<string, CalendarEvent[]>();

    filteredEvents.forEach(event => {
      const dateKey = event.startTime.toDateString();
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });

    // 按日期排序
    const sortedDates = Array.from(eventsByDate.keys()).sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );

    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-600 mb-4">
          按时间线显示事件安排
        </div>
        {sortedDates.map((dateKey) => {
          const events = eventsByDate.get(dateKey)!;
          const sortedEvents = events.sort((a, b) =>
            a.startTime.getTime() - b.startTime.getTime()
          );
          const date = new Date(dateKey);
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={dateKey} className="relative">
              {/* 日期标题 */}
              <div className={`sticky top-0 z-10 py-2 px-4 rounded-lg mb-4 ${
                isToday ? 'bg-blue-100 border border-blue-200' : 'bg-gray-100 border border-gray-200'
              }`}>
                <h3 className={`font-medium ${isToday ? 'text-blue-800' : 'text-gray-800'}`}>
                  {date.toLocaleDateString('zh-CN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {isToday && <span className="ml-2 text-sm">(今天)</span>}
                </h3>
                <div className="text-sm text-gray-600">
                  {events.length}个事件
                </div>
              </div>

              {/* 时间轴 */}
              <div className="relative pl-8">
                {/* 时间轴线 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                {/* 事件列表 */}
                <div className="space-y-4">
                  {sortedEvents.map((event, index) => (
                    <div key={event.id} className="relative">
                      {/* 时间点 */}
                      <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-white ${
                        event.priority === 'urgent' ? 'bg-red-500' :
                        event.priority === 'high' ? 'bg-orange-500' :
                        event.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></div>

                      {/* 事件卡片 */}
                      <Card
                        className={`ml-2 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01] ${
                          isToday ? 'border-blue-200' : ''
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-500">
                                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                </span>
                                <Badge variant="outline" className={getPriorityColor(event.priority)}>
                                  {getPriorityLabel(event.priority)}
                                </Badge>
                                {event.isOnline && (
                                  <Badge variant="outline" className="text-blue-600">
                                    <Video className="h-3 w-3 mr-1" />
                                    在线
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium mb-1">{event.title}</h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {event.participants.join(', ')}
                                </div>
                              </div>
                            </div>
                            <Badge className={getEventTypeColor(event.type)}>
                              {getEventTypeLabel(event.type)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 工具栏 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              日程安排
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建事件
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建新事件</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="event-title">事件标题</Label>
                        <Input
                          id="event-title"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="输入事件标题"
                        />
                      </div>
                      <div>
                        <Label htmlFor="event-type">事件类型</Label>
                        <Select
                          value={newEvent.type}
                          onValueChange={(value: CalendarEvent['type']) =>
                            setNewEvent(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hearing">庭审</SelectItem>
                            <SelectItem value="mediation">调解</SelectItem>
                            <SelectItem value="meeting">会议</SelectItem>
                            <SelectItem value="deadline">截止时间</SelectItem>
                            <SelectItem value="consultation">咨询</SelectItem>
                            <SelectItem value="other">其他</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time">开始时间</Label>
                        <Input
                          id="start-time"
                          type="datetime-local"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time">结束时间</Label>
                        <Input
                          id="end-time"
                          type="datetime-local"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">地点</Label>
                        <Input
                          id="location"
                          value={newEvent.location}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="会议地点或房间"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priority">优先级</Label>
                        <Select
                          value={newEvent.priority}
                          onValueChange={(value: CalendarEvent['priority']) =>
                            setNewEvent(prev => ({ ...prev, priority: value }))
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
                    </div>

                    <div>
                      <Label htmlFor="participants">参与者</Label>
                      <Input
                        id="participants"
                        value={newEvent.participants}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, participants: e.target.value }))}
                        placeholder="参与者姓名，用逗号分隔"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">描述</Label>
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="事件描述或备注"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        取消
                      </Button>
                      <Button onClick={handleCreateEvent}>
                        创建事件
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* 视图切换 */}
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['month', 'week', 'day', 'list', 'swimlane', 'timeline'] as ViewMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      <div className="flex items-center gap-2">
                        {getViewModeIcon(mode)}
                        {getViewModeLabel(mode)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 类型筛选 */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="hearing">庭审</SelectItem>
                  <SelectItem value="mediation">调解</SelectItem>
                  <SelectItem value="meeting">会议</SelectItem>
                  <SelectItem value="deadline">截止时间</SelectItem>
                  <SelectItem value="consultation">咨询</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>

              {/* 搜索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索事件或参与者..."
                  className="pl-10 w-64"
                />
              </div>
            </div>

            {/* 日期导航 */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <Card>
        <CardContent className="p-6">
          {viewMode === 'list' && renderListView()}
          {viewMode === 'swimlane' && renderSwimlaneView()}
          {viewMode === 'timeline' && renderTimelineView()}
          {(viewMode === 'month' || viewMode === 'week' || viewMode === 'day') && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>{getViewModeLabel(viewMode)}正在开发中...</p>
              <p className="text-sm mt-2">请使用列表视图或泳道视图查看事件</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 事件详情对话框 */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getEventTypeIcon(selectedEvent.type)}
                {selectedEvent.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getEventTypeColor(selectedEvent.type)}>
                  {getEventTypeLabel(selectedEvent.type)}
                </Badge>
                <Badge className={getPriorityColor(selectedEvent.priority)}>
                  优先级：{getPriorityLabel(selectedEvent.priority)}
                </Badge>
                {selectedEvent.isOnline && (
                  <Badge variant="outline" className="text-blue-600">
                    <Video className="h-3 w-3 mr-1" />
                    在线会议
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">开始时间</div>
                  <div className="font-medium">
                    {selectedEvent.startTime.toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">结束时间</div>
                  <div className="font-medium">
                    {selectedEvent.endTime.toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              {selectedEvent.location && (
                <div className="text-sm">
                  <div className="text-gray-600">地点</div>
                  <div className="font-medium flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.location}
                  </div>
                </div>
              )}

              <div className="text-sm">
                <div className="text-gray-600">参与者</div>
                <div className="font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedEvent.participants.join(', ')}
                </div>
              </div>

              {selectedEvent.description && (
                <div className="text-sm">
                  <div className="text-gray-600">描述</div>
                  <div className="font-medium">{selectedEvent.description}</div>
                </div>
              )}

              {selectedEvent.meetingLink && (
                <div className="text-sm">
                  <div className="text-gray-600">会议链接</div>
                  <div className="font-medium">
                    <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer"
                       className="text-blue-600 hover:underline flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      加入在线会议
                    </a>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  关闭
                </Button>
                <Button>
                  编辑事件
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
