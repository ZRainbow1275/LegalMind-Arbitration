import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Target,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Edit3
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';
import { EditorModal } from '../common/EditorModal';

import { TimelineMetadata, TimelineEvent } from '../workspace/types';

interface TimelineEditorProps {
  node: LegalNode;
  onSave: (updates: Partial<LegalNode>) => void;
  onClose: () => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  node,
  onSave,
  onClose
}) => {
  const metadata = node.data.metadata as TimelineMetadata;

  const [formData, setFormData] = useState({
    title: node.data.title,
    description: node.data.description,
    status: node.data.status,
    startDate: metadata?.startDate || '',
    endDate: metadata?.endDate || '',
    totalEvents: metadata?.totalEvents || 0,
    completedEvents: metadata?.completedEvents || 0,
    upcomingEvents: metadata?.upcomingEvents || 0,
    criticalPath: metadata?.criticalPath || false,
    milestones: metadata?.milestones || [],
    tags: metadata?.tags || []
  });

  const [events, setEvents] = useState<TimelineEvent[]>(
    metadata?.events || []
  );

  const [activeSection, setActiveSection] = useState<'basic' | 'events' | 'milestones' | 'analysis'>('basic');

  const handleSave = () => {
    onSave({
      data: {
        ...node.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: {
          ...node.data.metadata,
          startDate: formData.startDate,
          endDate: formData.endDate,
          totalEvents: events.length,
          completedEvents: events.filter(e => e.type === 'decision').length,
          upcomingEvents: events.filter(e => new Date(e.date) > new Date()).length,
          criticalPath: formData.criticalPath,
          milestones: formData.milestones,
          tags: formData.tags,
          events
        }
      }
    });
    onClose();
  };

  const addEvent = () => {
    const newEvent: TimelineEvent = {
      id: `event-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      title: '新事件',
      description: '',
      type: 'other',
      importance: 'medium',
      relatedDocuments: []
    };
    setEvents([...events, newEvent]);

  };

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };



  const eventTypes = {
    filing: { label: '立案', color: 'bg-blue-500' },
    hearing: { label: '庭审', color: 'bg-orange-500' },
    evidence: { label: '证据', color: 'bg-purple-500' },
    decision: { label: '裁决', color: 'bg-green-500' },
    other: { label: '其他', color: 'bg-gray-500' }
  };

  const importanceLevels = {
    high: { label: '高', color: 'text-red-600' },
    medium: { label: '中', color: 'text-yellow-600' },
    low: { label: '低', color: 'text-gray-600' }
  };

  return (
    <EditorModal
      isOpen={true}
      title="时间轴编辑器"
      subtitle={`ID: ${node.id}`}
      icon={<Target className="w-5 h-5 text-white" />}
      iconBgColor="bg-red-500"
      onClose={onClose}
      footer={
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            最后修改: {new Date().toLocaleString('zh-CN')}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      }
    >
      {/* 标签页导航 */}
      <div className="flex space-x-1 mb-4">
        {[
          { key: 'basic', label: '基本信息', icon: Target },
          { key: 'events', label: '事件列表', icon: Calendar },
          { key: 'milestones', label: '里程碑', icon: CheckCircle },
          { key: 'analysis', label: '进度分析', icon: AlertCircle }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeSection === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSection(key as any)}
            className="flex items-center space-x-2"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      <Separator className="mb-4" />

      {/* 基本信息 */}
      {activeSection === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时间轴标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="例如：案件进展时间轴"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="时间轴的详细说明..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={formData.startDate as string}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={formData.endDate as string}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="pending">待处理</option>
              <option value="active">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="criticalPath"
              checked={formData.criticalPath}
              onChange={(e) => setFormData({ ...formData, criticalPath: e.target.checked })}
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="criticalPath" className="text-sm font-medium text-gray-700">
              标记为关键路径
            </label>
          </div>
        </div>
      )}

      {/* 事件列表 */}
      {activeSection === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              事件列表 ({events.length})
            </h3>
            <Button onClick={addEvent} size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-1" />
              添加事件
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((event) => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={`${eventTypes[event.type].color} text-white`}>
                        {eventTypes[event.type].label}
                      </Badge>
                      <span className={`text-xs font-medium ${importanceLevels[event.importance].color}`}>
                        {importanceLevels[event.importance].label}重要
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {event.date}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {event.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEvent(event.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </EditorModal>
  );
};

