// dev/src/components/schedule/swimlane-calendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Video, 
  MapPin, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Scale,
  FileText,
  MessageSquare
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  type: string;
  caseId?: string;
  mediationId?: string;
  date: string;
  time: string;
  location: string;
  participants: string[];
  status: string;
  priority: string;
  description: string;
  meetingType: 'online' | 'offline';
}

interface SwimLaneCalendarProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onCreateEvent: (date: string, lane: string) => void;
}

export function SwimLaneCalendar({ events, onEventClick, onCreateEvent }: SwimLaneCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // 泳道定义
  const swimLanes = [
    { id: 'arbitration', name: '仲裁庭审', color: 'bg-blue-50 border-blue-200', icon: Gavel },
    { id: 'mediation', name: '调解会议', color: 'bg-green-50 border-green-200', icon: Scale },
    { id: 'consultation', name: '咨询会议', color: 'bg-purple-50 border-purple-200', icon: MessageSquare },
    { id: 'document', name: '文档审查', color: 'bg-orange-50 border-orange-200', icon: FileText },
    { id: 'other', name: '其他事项', color: 'bg-gray-50 border-gray-200', icon: CalendarIcon }
  ];

  // 获取当前周的日期
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    startOfWeek.setDate(diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // 按日期和泳道分组事件
  const groupedEvents = useMemo(() => {
    const grouped: { [key: string]: { [key: string]: Event[] } } = {};
    
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      grouped[dateStr] = {};
      swimLanes.forEach(lane => {
        grouped[dateStr][lane.id] = [];
      });
    });

    events.forEach(event => {
      const eventDate = event.date;
      if (grouped[eventDate]) {
        // 根据事件类型分配到对应泳道
        let laneId = 'other';
        if (event.type.includes('开庭') || event.type.includes('仲裁')) {
          laneId = 'arbitration';
        } else if (event.type.includes('调解')) {
          laneId = 'mediation';
        } else if (event.type.includes('咨询')) {
          laneId = 'consultation';
        } else if (event.type.includes('文档') || event.type.includes('审查')) {
          laneId = 'document';
        }
        
        if (grouped[eventDate][laneId]) {
          grouped[eventDate][laneId].push(event);
        }
      }
    });

    // 对每个日期的每个泳道中的事件按时间排序
    Object.keys(grouped).forEach(dateStr => {
      Object.keys(grouped[dateStr]).forEach(laneId => {
        grouped[dateStr][laneId].sort((a, b) => {
          // 将时间字符串转换为可比较的格式
          const timeA = a.time.replace(':', '');
          const timeB = b.time.replace(':', '');
          return timeA.localeCompare(timeB);
        });
      });
    });

    return grouped;
  }, [events, weekDates]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已确认': return 'bg-green-100 text-green-800';
      case '待确认': return 'bg-yellow-100 text-yellow-800';
      case '已取消': return 'bg-red-100 text-red-800';
      case '进行中': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高': return 'border-l-4 border-red-500';
      case '中': return 'border-l-4 border-yellow-500';
      case '低': return 'border-l-4 border-green-500';
      default: return 'border-l-4 border-gray-300';
    }
  };

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    return {
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday
    };
  };

  return (
    <div className="space-y-4">
      {/* 日历头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              今天
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 视图模式切换 */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="rounded-r-none border-0"
            >
              周视图
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-l-none border-0"
            >
              月视图
            </Button>
          </div>

          {/* 泳道图例 */}
          <div className="flex items-center gap-2">
            {swimLanes.map(lane => {
              const Icon = lane.icon;
              return (
                <div key={lane.id} className="flex items-center gap-1 text-xs">
                  <div className={`w-3 h-3 rounded ${lane.color}`}></div>
                  <Icon className="h-3 w-3" />
                  <span>{lane.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 泳道日历 */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b">
            {/* 泳道标题列 */}
            <div className="border-r bg-gray-50">
              <div className="h-12 flex items-center justify-center font-medium text-sm border-b">
                泳道
              </div>
              {swimLanes.map(lane => {
                const Icon = lane.icon;
                return (
                  <div key={lane.id} className={`h-24 flex items-center justify-center border-b ${lane.color}`}>
                    <div className="text-center">
                      <Icon className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-xs font-medium">{lane.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 日期列 */}
            {weekDates.map(date => {
              const dateInfo = formatDateHeader(date);
              const dateStr = date.toISOString().split('T')[0];
              
              return (
                <div key={dateStr} className="border-r">
                  {/* 日期头部 */}
                  <div className={`h-12 flex flex-col items-center justify-center border-b ${
                    dateInfo.isToday ? 'bg-blue-50 text-blue-600' : 'bg-gray-50'
                  }`}>
                    <div className="text-xs">{dateInfo.dayName}</div>
                    <div className={`text-sm font-medium ${
                      dateInfo.isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                    }`}>
                      {dateInfo.dayNumber}
                    </div>
                  </div>

                  {/* 泳道单元格 */}
                  {swimLanes.map(lane => (
                    <div 
                      key={`${dateStr}-${lane.id}`} 
                      className="h-24 border-b p-1 relative group cursor-pointer hover:bg-gray-50"
                      onClick={() => onCreateEvent(dateStr, lane.id)}
                    >
                      {/* 添加事件按钮 */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* 事件列表 */}
                      <div className="space-y-1 h-full overflow-hidden">
                        {groupedEvents[dateStr]?.[lane.id]?.map(event => (
                          <div
                            key={event.id}
                            className={`p-1 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow ${getPriorityColor(event.priority)}`}
                            style={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowEventDetail(true);
                            }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-gray-500 truncate">{event.time}</div>
                            <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                              {event.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 事件详情对话框 */}
      <Dialog open={showEventDetail} onOpenChange={setShowEventDetail}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.type} · {selectedEvent.date} {selectedEvent.time}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedEvent.status)}>
                    {selectedEvent.status}
                  </Badge>
                  <Badge variant="outline">{selectedEvent.priority}优先级</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {selectedEvent.meetingType === 'online' ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    <span>{selectedEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{selectedEvent.participants.join(', ')}</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  {selectedEvent.description}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEventDetail(false)}>
                  关闭
                </Button>
                <Button onClick={() => {
                  onEventClick(selectedEvent);
                  setShowEventDetail(false);
                }}>
                  查看详情
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
