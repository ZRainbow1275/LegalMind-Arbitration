import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import { Card } from '../ui/card'; // {{ AURA: Fix - 添加Card组件导入 }}
import {
  Scale,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  Save
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';
import { EditorModal } from '../common/EditorModal';

import { CaseInfoMetadata } from '../workspace/types';

interface CaseInfoEditorProps {
  node: LegalNode;
  onSave: (updates: Partial<LegalNode>) => void;
  onClose: () => void;
}

export const CaseInfoEditor: React.FC<CaseInfoEditorProps> = ({
  node,
  onSave,
  onClose
}) => {
  const metadata = node.data.metadata as CaseInfoMetadata;

  const [formData, setFormData] = useState({
    title: node.data.title,
    description: node.data.description,
    status: node.data.status,
    caseNumber: metadata?.caseNumber || '',
    caseType: metadata?.caseType || '商事仲裁',
    disputeAmount: metadata?.disputeAmount || '',
    filingDate: metadata?.filingDate || '',
    hearingDate: metadata?.hearingDate || '',
    jurisdiction: metadata?.jurisdiction || '',
    urgencyLevel: metadata?.urgencyLevel || 'medium',
    legalBasis: metadata?.legalBasis || '',
    caseBackground: metadata?.caseBackground || '',
    disputeFocus: metadata?.disputeFocus || '',
    evidenceSummary: metadata?.evidenceSummary || '',
    riskAssessment: metadata?.riskAssessment || 'medium'
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'details' | 'legal' | 'analysis'>('basic');

  const handleSave = () => {
    const updates: Partial<LegalNode> = {
      data: {
        ...node.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: {
          ...node.data.metadata,
          caseNumber: formData.caseNumber,
          caseType: formData.caseType,
          disputeAmount: formData.disputeAmount,
          filingDate: formData.filingDate,
          hearingDate: formData.hearingDate,
          jurisdiction: formData.jurisdiction,
          urgencyLevel: formData.urgencyLevel,
          legalBasis: formData.legalBasis,
          caseBackground: formData.caseBackground,
          disputeFocus: formData.disputeFocus,
          evidenceSummary: formData.evidenceSummary,
          riskAssessment: formData.riskAssessment
        }
      }
    };
    onSave(updates);
    onClose();
  };

  const urgencyColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const riskColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <EditorModal
      isOpen={true}
      title="案件信息编辑器"
      subtitle={`ID: ${node.id}`}
      icon={<Scale className="w-5 h-5 text-white" />}
      iconBgColor="bg-blue-500"
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
          { key: 'basic', label: '基本信息', icon: FileText },
          { key: 'details', label: '案件详情', icon: Scale },
          { key: 'legal', label: '法律依据', icon: Users },
          { key: 'analysis', label: '风险分析', icon: AlertTriangle }
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
              <label className="block text-sm font-medium mb-2">案件标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入案件标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">案件描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入案件描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">案件编号</label>
                <input
                  type="text"
                  value={formData.caseNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, caseNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="如：2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">案件类型</label>
                <select
                  value={formData.caseType}
                  onChange={(e) => setFormData(prev => ({ ...prev, caseType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="商事仲裁">商事仲裁</option>
                  <option value="劳动争议">劳动争议</option>
                  <option value="合同纠纷">合同纠纷</option>
                  <option value="知识产权">知识产权</option>
                  <option value="投资争议">投资争议</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">争议金额</label>
                <input
                  type="text"
                  value={formData.disputeAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, disputeAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="如：100万元"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">管辖地</label>
                <input
                  type="text"
                  value={formData.jurisdiction}
                  onChange={(e) => setFormData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="如：北京仲裁委员会"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">立案日期</label>
                <input
                  type="date"
                  value={formData.filingDate as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, filingDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">开庭日期</label>
                <input
                  type="date"
                  value={formData.hearingDate as string}
                  onChange={(e) => setFormData(prev => ({ ...prev, hearingDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">紧急程度</label>
                <select
                  value={formData.urgencyLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, urgencyLevel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">案件状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="pending">待处理</option>
                  <option value="active">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">案件背景</label>
              <textarea
                value={formData.caseBackground}
                onChange={(e) => setFormData(prev => ({ ...prev, caseBackground: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="详细描述案件的背景情况..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">争议焦点</label>
              <textarea
                value={formData.disputeFocus}
                onChange={(e) => setFormData(prev => ({ ...prev, disputeFocus: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="列出主要的争议焦点..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">证据摘要</label>
              <textarea
                value={formData.evidenceSummary}
                onChange={(e) => setFormData(prev => ({ ...prev, evidenceSummary: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="总结关键证据..."
              />
            </div>
          </div>
        )}

        {activeSection === 'legal' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">法律依据</label>
              <textarea
                value={formData.legalBasis}
                onChange={(e) => setFormData(prev => ({ ...prev, legalBasis: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="列出相关的法律条文、司法解释、仲裁规则等..."
              />
            </div>
          </div>
        )}

        {activeSection === 'analysis' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">风险评估</label>
              <select
                value={formData.riskAssessment}
                onChange={(e) => setFormData(prev => ({ ...prev, riskAssessment: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="low">低风险</option>
                <option value="medium">中等风险</option>
                <option value="high">高风险</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">紧急程度</span>
                </div>
                <Badge className={urgencyColors[formData.urgencyLevel as keyof typeof urgencyColors]}>
                  {formData.urgencyLevel === 'low' ? '低' :
                    formData.urgencyLevel === 'medium' ? '中' : '高'}
                </Badge>
              </Card>

              <Card className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="font-medium">风险等级</span>
                </div>
                <Badge className={riskColors[formData.riskAssessment as keyof typeof riskColors]}>
                  {formData.riskAssessment === 'low' ? '低风险' :
                    formData.riskAssessment === 'medium' ? '中等风险' : '高风险'}
                </Badge>
              </Card>
            </div>
          </div>
        )}
      </div>
    </EditorModal>
  );
};
