import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  MessageSquare,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';
import { EditorModal } from '../common/EditorModal';

import { MediationMetadata, MediationSession } from '../workspace/types';

interface MediationEditorProps {
  node: LegalNode;
  onSave: (updates: Partial<LegalNode>) => void;
  onClose: () => void;
}

export const MediationEditor: React.FC<MediationEditorProps> = ({
  node,
  onSave,
  onClose
}) => {
  const metadata = node.data.metadata as MediationMetadata;

  const [formData, setFormData] = useState({
    title: node.data.title,
    description: node.data.description,
    status: node.data.status,
    mediationType: metadata?.mediationType || 'voluntary',
    mediationStage: metadata?.mediationStage || 'initial',
    scheduledDate: metadata?.scheduledDate || '',
    scheduledTime: metadata?.scheduledTime || '',
    mediator: metadata?.mediator || '',
    mediatorOrganization: metadata?.mediatorOrganization || '',
    venue: metadata?.venue || '',
    isVirtual: metadata?.isVirtual || false,
    virtualPlatform: metadata?.virtualPlatform || '',
    meetingLink: metadata?.meetingLink || '',
    disputeAmount: metadata?.disputeAmount || '',
    settlementAmount: metadata?.settlementAmount || '',
    settlementTerms: metadata?.settlementTerms || '',
    confidentialityAgreement: metadata?.confidentialityAgreement || false,
    legalBinding: metadata?.legalBinding || false,
    followUpRequired: metadata?.followUpRequired || false,
    followUpDate: metadata?.followUpDate || '',
    successRate: metadata?.successRate || 0,
    notes: metadata?.notes || ''
  });

  const [sessions, setSessions] = useState<MediationSession[]>(
    metadata?.sessions || []
  );

  const [activeSection, setActiveSection] = useState<'basic' | 'sessions' | 'settlement' | 'notes'>('basic');

  const handleSave = () => {
    onSave({
      data: {
        ...node.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: {
          ...node.data.metadata,
          ...formData,
          sessions,
          totalSessions: sessions.length,
          successfulSessions: sessions.filter(s => s.outcome === 'agreement').length
        }
      }
    });
    onClose();
  };

  const addSession = () => {
    const newSession: MediationSession = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      duration: 120,
      mediator: formData.mediator,
      participants: [],
      topics: [],
      outcome: 'pending',
      notes: ''
    };
    setSessions([...sessions, newSession]);
  };

  const deleteSession = (sessionId: string) => {
    setSessions(sessions.filter(s => s.id !== sessionId));
  };

  const mediationTypes = {
    voluntary: '自愿调解',
    court: '法院调解',
    administrative: '行政调解',
    commercial: '商事调解'
  };

  const mediationStages = {
    initial: '初步接触',
    negotiation: '协商谈判',
    agreement: '达成协议',
    implementation: '执行阶段',
    completed: '已完成',
    failed: '调解失败'
  };

  const outcomeTypes = {
    agreement: { label: '达成协议', color: 'bg-green-500', icon: CheckCircle },
    partial: { label: '部分协议', color: 'bg-yellow-500', icon: AlertCircle },
    failed: { label: '调解失败', color: 'bg-red-500', icon: XCircle },
    pending: { label: '进行中', color: 'bg-blue-500', icon: Clock }
  };

  return (
    <EditorModal
      isOpen={true}
      title="调解记录编辑器"
      subtitle={`ID: ${node.id}`}
      icon={<MessageSquare className="w-5 h-5 text-white" />}
      iconBgColor="bg-yellow-500"
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
          { key: 'basic', label: '基本信息', icon: MessageSquare },
          { key: 'sessions', label: '调解会议', icon: Calendar },
          { key: 'settlement', label: '和解方案', icon: FileText },
          { key: 'notes', label: '备注记录', icon: FileText }
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
              调解标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="例如：合同纠纷调解"
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
              placeholder="调解的详细说明..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                调解类型
              </label>
              <select
                value={formData.mediationType}
                onChange={(e) => setFormData({ ...formData, mediationType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(mediationTypes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                调解阶段
              </label>
              <select
                value={formData.mediationStage}
                onChange={(e) => setFormData({ ...formData, mediationStage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(mediationStages).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                调解员
              </label>
              <input
                type="text"
                value={formData.mediator}
                onChange={(e) => setFormData({ ...formData, mediator: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="调解员姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                调解机构
              </label>
              <input
                type="text"
                value={formData.mediatorOrganization}
                onChange={(e) => setFormData({ ...formData, mediatorOrganization: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="调解机构名称"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预定日期
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预定时间
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isVirtual"
              checked={formData.isVirtual}
              onChange={(e) => setFormData({ ...formData, isVirtual: e.target.checked })}
              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
            />
            <label htmlFor="isVirtual" className="text-sm font-medium text-gray-700">
              在线调解
            </label>
          </div>

          {formData.isVirtual && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  在线平台
                </label>
                <input
                  type="text"
                  value={formData.virtualPlatform}
                  onChange={(e) => setFormData({ ...formData, virtualPlatform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="例如：腾讯会议、Zoom"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会议链接
                </label>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 调解会议 */}
      {activeSection === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              调解会议记录 ({sessions.length})
            </h3>
            <Button onClick={addSession} size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-1" />
              添加会议
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session, index) => {
              const OutcomeIcon = outcomeTypes[session.outcome].icon;
              return (
                <div key={session.id} className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          第 {index + 1} 次调解会议
                        </span>
                        <Badge className={`${outcomeTypes[session.outcome].color} text-white`}>
                          <OutcomeIcon className="w-3 h-3 mr-1" />
                          {outcomeTypes[session.outcome].label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {session.date}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {session.time} ({session.duration}分钟)
                        </div>
                      </div>
                      {session.notes && (
                        <p className="text-sm text-gray-600 mt-2">{session.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </EditorModal>
  );
};

