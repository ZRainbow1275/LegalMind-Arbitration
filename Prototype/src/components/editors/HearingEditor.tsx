import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  Calendar,
  Users,
  Video,
  Mic,
  Monitor,
  FileText,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';
import { EditorModal } from '../common/EditorModal';
import { HearingMetadata } from '../workspace/types';

interface HearingEditorProps {
  node: LegalNode;
  onSave: (updates: Partial<LegalNode>) => void;
  onClose: () => void;
}

interface Participant {
  name: string;
  role: string;
  attendance: 'required' | 'optional' | 'confirmed' | 'declined';
  contactInfo: string;
}

interface HearingDocument {
  name: string;
  type: string;
  required: boolean;
  submitted: boolean;
}

export const HearingEditor: React.FC<HearingEditorProps> = ({
  node,
  onSave,
  onClose
}) => {
  const metadata = node.data.metadata as HearingMetadata;

  const [formData, setFormData] = useState({
    title: node.data.title,
    description: node.data.description,
    status: node.data.status,
    hearingType: metadata?.hearingType || 'formal',
    scheduledDate: metadata?.scheduledDate || '',
    scheduledTime: metadata?.scheduledTime || '',
    duration: metadata?.duration || '120',
    venue: metadata?.venue || '',
    isVirtual: metadata?.isVirtual || false,
    virtualPlatform: metadata?.virtualPlatform || '',
    meetingLink: metadata?.meetingLink || '',
    arbitrator: metadata?.arbitrator || '',
    secretary: metadata?.secretary || '',
    agenda: metadata?.agenda || '',
    preparationNotes: metadata?.preparationNotes || '',
    technicalRequirements: metadata?.technicalRequirements || '',
    participants: (metadata?.participants || []) as Participant[],
    documents: (metadata?.documents || []) as HearingDocument[],
    recordingEnabled: (metadata?.recordingEnabled ?? true) as boolean,
    interpreterNeeded: metadata?.interpreterNeeded || false,
    interpreterLanguage: metadata?.interpreterLanguage || ''
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'participants' | 'documents' | 'technical'>('basic');
  const [newParticipant, setNewParticipant] = useState<Participant>({
    name: '',
    role: '',
    attendance: 'required',
    contactInfo: ''
  });
  const [newDocument, setNewDocument] = useState<HearingDocument>({
    name: '',
    type: 'evidence',
    required: true,
    submitted: false
  });

  const handleSave = () => {
    const updates: Partial<LegalNode> = {
      data: {
        ...node.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: {
          ...node.data.metadata,
          hearingType: formData.hearingType,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          duration: formData.duration,
          venue: formData.venue,
          isVirtual: formData.isVirtual,
          virtualPlatform: formData.virtualPlatform,
          meetingLink: formData.meetingLink,
          arbitrator: formData.arbitrator,
          secretary: formData.secretary,
          agenda: formData.agenda,
          preparationNotes: formData.preparationNotes,
          technicalRequirements: formData.technicalRequirements,
          participants: formData.participants,
          documents: formData.documents,
          recordingEnabled: formData.recordingEnabled,
          interpreterNeeded: formData.interpreterNeeded,
          interpreterLanguage: formData.interpreterLanguage
        } as HearingMetadata
      }
    };
    onSave(updates);
    onClose();
  };

  const addParticipant = () => {
    if (newParticipant.name && newParticipant.role) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, { ...newParticipant }]
      }));
      setNewParticipant({ name: '', role: '', attendance: 'required', contactInfo: '' });
    }
  };

  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  const addDocument = () => {
    if (newDocument.name) {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, { ...newDocument }]
      }));
      setNewDocument({ name: '', type: 'evidence', required: true, submitted: false });
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const hearingTypes: Record<string, string> = {
    formal: '正式庭审',
    preliminary: '预备庭审',
    mediation: '调解会议',
    evidence: '证据交换',
    closing: '结案陈述'
  };

  const attendanceColors: Record<string, string> = {
    required: 'bg-red-100 text-red-800',
    optional: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    declined: 'bg-gray-100 text-gray-800'
  };

  const documentTypes: Record<string, string> = {
    evidence: '证据材料',
    pleading: '诉讼文书',
    expert: '专家报告',
    witness: '证人证言',
    legal: '法律文件'
  };

  return (
    <EditorModal
      isOpen={true}
      title="庭审安排编辑器"
      subtitle={`ID: ${node.id} `}
      icon={<Calendar className="w-5 h-5 text-white" />}
      iconBgColor="bg-orange-500"
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
          { key: 'basic', label: '基本信息', icon: Calendar },
          { key: 'participants', label: '参与人员', icon: Users },
          { key: 'documents', label: '文档清单', icon: FileText },
          { key: 'technical', label: '技术设置', icon: Monitor }
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

      {/* 内容区域 */}
      <div>
        {activeSection === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">庭审标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入庭审标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">庭审描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入庭审描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">庭审类型</label>
                <select
                  value={formData.hearingType}
                  onChange={(e) => setFormData(prev => ({ ...prev, hearingType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(hearingTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">庭审状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="pending">待安排</option>
                  <option value="scheduled">已安排</option>
                  <option value="active">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">日期</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">时间</label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">时长(分钟)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="120"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={formData.isVirtual}
                  onChange={(e) => setFormData(prev => ({ ...prev, isVirtual: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isVirtual" className="text-sm font-medium">线上庭审</label>
              </div>
            </div>

            {formData.isVirtual ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">会议平台</label>
                  <select
                    value={formData.virtualPlatform}
                    onChange={(e) => setFormData(prev => ({ ...prev, virtualPlatform: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">选择平台</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="webex">Cisco Webex</option>
                    <option value="tencent">腾讯会议</option>
                    <option value="dingtalk">钉钉</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">会议链接</label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">庭审地点</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入庭审地点"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">主审仲裁员</label>
                <input
                  type="text"
                  value={formData.arbitrator}
                  onChange={(e) => setFormData(prev => ({ ...prev, arbitrator: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入仲裁员姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">书记员</label>
                <input
                  type="text"
                  value={formData.secretary}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入书记员姓名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">庭审议程</label>
              <textarea
                value={formData.agenda}
                onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入庭审议程..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">准备事项</label>
              <textarea
                value={formData.preparationNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, preparationNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入庭审准备事项..."
              />
            </div>
          </div>
        )}

        {activeSection === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">参与人员</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addParticipant}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>添加参与人员</span>
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-md">
              <input
                type="text"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                placeholder="姓名"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={newParticipant.role}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, role: e.target.value }))}
                placeholder="角色"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={newParticipant.attendance}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, attendance: e.target.value as any }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="required">必须参加</option>
                <option value="optional">可选参加</option>
                <option value="confirmed">已确认</option>
                <option value="declined">已拒绝</option>
              </select>
              <input
                type="text"
                value={newParticipant.contactInfo}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, contactInfo: e.target.value }))}
                placeholder="联系方式"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="space-y-2">
              {formData.participants.map((participant, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-sm text-gray-500">{participant.role} • {participant.contactInfo}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={attendanceColors[participant.attendance]}>
                      {participant.attendance === 'required' ? '必须参加' :
                        participant.attendance === 'optional' ? '可选参加' :
                          participant.attendance === 'confirmed' ? '已确认' : '已拒绝'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">文档清单</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addDocument}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>添加文档</span>
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-md">
              <input
                type="text"
                value={newDocument.name}
                onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                placeholder="文档名称"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={newDocument.type}
                onChange={(e) => setNewDocument(prev => ({ ...prev, type: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {Object.entries(documentTypes).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={newDocument.required.toString()}
                onChange={(e) => setNewDocument(prev => ({ ...prev, required: e.target.value === 'true' }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="true">必需</option>
                <option value="false">可选</option>
              </select>
              <select
                value={newDocument.submitted.toString()}
                onChange={(e) => setNewDocument(prev => ({ ...prev, submitted: e.target.value === 'true' }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="false">未提交</option>
                <option value="true">已提交</option>
              </select>
            </div>

            <div className="space-y-2">
              {formData.documents.map((document, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{document.name}</div>
                      <div className="text-sm text-gray-500">{documentTypes[document.type as keyof typeof documentTypes]}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={document.required ? "destructive" : "secondary"}>
                      {document.required ? '必需' : '可选'}
                    </Badge>
                    <Badge variant={document.submitted ? "default" : "outline"}>
                      {document.submitted ? '已提交' : '未提交'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'technical' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="recordingEnabled"
                  checked={formData.recordingEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, recordingEnabled: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="recordingEnabled" className="text-sm font-medium">启用录音录像</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="interpreterNeeded"
                  checked={formData.interpreterNeeded}
                  onChange={(e) => setFormData(prev => ({ ...prev, interpreterNeeded: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="interpreterNeeded" className="text-sm font-medium">需要翻译</label>
              </div>
            </div>

            {formData.interpreterNeeded && (
              <div>
                <label className="block text-sm font-medium mb-2">翻译语言</label>
                <select
                  value={formData.interpreterLanguage}
                  onChange={(e) => setFormData(prev => ({ ...prev, interpreterLanguage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">选择语言</option>
                  <option value="english">英语</option>
                  <option value="japanese">日语</option>
                  <option value="korean">韩语</option>
                  <option value="french">法语</option>
                  <option value="german">德语</option>
                  <option value="spanish">西班牙语</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">技术要求</label>
              <textarea
                value={formData.technicalRequirements}
                onChange={(e) => setFormData(prev => ({ ...prev, technicalRequirements: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入技术要求和设备需求..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center">
                <Video className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-sm font-medium">视频会议</div>
                <div className="text-xs text-gray-500">
                  {formData.isVirtual ? '已启用' : '未启用'}
                </div>
              </Card>

              <Card className="p-4 text-center">
                <Mic className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-sm font-medium">录音功能</div>
                <div className="text-xs text-gray-500">
                  {formData.recordingEnabled ? '已启用' : '未启用'}
                </div>
              </Card>

              <Card className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <div className="text-sm font-medium">翻译服务</div>
                <div className="text-xs text-gray-500">
                  {formData.interpreterNeeded ? '需要' : '不需要'}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </EditorModal>
  );
};
