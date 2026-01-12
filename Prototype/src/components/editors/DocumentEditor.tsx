import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

import { Card } from '../ui/card';
import {
  FileText,
  Eye,
  Clock,
  Shield,
  Plus,
  Save,
  X
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';
import { EditorModal } from '../common/EditorModal';

import { DocumentMetadata } from '../workspace/types';

interface DocumentEditorProps {
  node: LegalNode;
  onSave: (updates: Partial<LegalNode>) => void;
  onClose: () => void;
}



interface DocumentTag {
  name: string;
  color: string;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  node,
  onSave,
  onClose
}) => {
  const metadata = node.data.metadata as DocumentMetadata;

  const [formData, setFormData] = useState({
    title: node.data.title,
    description: node.data.description,
    status: node.data.status,
    documentType: metadata?.documentType || 'contract',
    fileName: metadata?.fileName || '',
    fileSize: metadata?.fileSize || '',
    uploadDate: metadata?.uploadDate || '',
    author: metadata?.author || '',
    source: metadata?.source || '',
    confidentialityLevel: metadata?.confidentialityLevel || 'public',
    evidenceType: metadata?.evidenceType || 'primary',
    relevanceScore: metadata?.relevanceScore || 5,
    authenticity: metadata?.authenticity || 'verified',
    legalSignificance: metadata?.legalSignificance || '',
    summary: metadata?.summary || '',
    keyPoints: metadata?.keyPoints || '',
    relatedClauses: metadata?.relatedClauses || '',
    versions: metadata?.versions || [],
    tags: metadata?.tags || []
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'content' | 'evidence' | 'versions'>('basic');
  const [newTag, setNewTag] = useState<DocumentTag>({ name: '', color: 'blue' });

  const handleSave = () => {
    const updates: Partial<LegalNode> = {
      data: {
        ...node.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: {
          ...node.data.metadata,
          documentType: formData.documentType,
          fileName: formData.fileName,
          fileSize: formData.fileSize,
          uploadDate: formData.uploadDate,
          author: formData.author,
          source: formData.source,
          confidentialityLevel: formData.confidentialityLevel,
          evidenceType: formData.evidenceType,
          relevanceScore: formData.relevanceScore,
          authenticity: formData.authenticity,
          legalSignificance: formData.legalSignificance,
          summary: formData.summary,
          keyPoints: formData.keyPoints,
          relatedClauses: formData.relatedClauses,
          versions: formData.versions,
          tags: formData.tags
        }
      }
    };
    onSave(updates);
    onClose();
  };

  const addTag = () => {
    if (newTag.name) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, { ...newTag }]
      }));
      setNewTag({ name: '', color: 'blue' });
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const documentTypeLabels = {
    contract: '合同协议',
    evidence: '证据材料',
    legal_document: '法律文书',
    correspondence: '往来函件',
    financial: '财务文件',
    technical: '技术文档',
    other: '其他文档'
  };

  const confidentialityLevels = {
    public: '公开',
    internal: '内部',
    confidential: '机密',
    secret: '秘密'
  };

  const evidenceTypes = {
    primary: '原始证据',
    secondary: '传来证据',
    circumstantial: '间接证据',
    expert: '专家意见',
    witness: '证人证言'
  };

  const authenticityLevels = {
    verified: '已验证',
    pending: '待验证',
    disputed: '存疑',
    rejected: '已否认'
  };

  const tagColors = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  return (
    <EditorModal
      isOpen={true}
      title="文档证据编辑器"
      subtitle={`ID: ${node.id}`}
      icon={<FileText className="w-5 h-5 text-white" />}
      iconBgColor="bg-purple-500"
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
          { key: 'content', label: '内容分析', icon: Eye },
          { key: 'evidence', label: '证据属性', icon: Shield },
          { key: 'versions', label: '版本管理', icon: Clock }
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
              <label className="block text-sm font-medium mb-2">文档标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入文档标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">文档描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入文档描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">文档类型</label>
                <select
                  value={formData.documentType}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(documentTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">保密级别</label>
                <select
                  value={formData.confidentialityLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, confidentialityLevel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(confidentialityLevels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">文件名</label>
                <input
                  type="text"
                  value={formData.fileName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fileName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="如：contract_2024.pdf"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">文件大小</label>
                <input
                  type="text"
                  value={formData.fileSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, fileSize: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="如：2.5MB"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">上传日期</label>
                <input
                  type="date"
                  value={formData.uploadDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, uploadDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">作者/来源</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入作者或来源"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">标签管理</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="标签名称"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <select
                  value={newTag.color}
                  onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="blue">蓝色</option>
                  <option value="green">绿色</option>
                  <option value="yellow">黄色</option>
                  <option value="red">红色</option>
                  <option value="purple">紫色</option>
                  <option value="gray">灰色</option>
                </select>
                <Button variant="outline" size="sm" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    className={`${tagColors[tag.color as keyof typeof tagColors]} flex items-center space-x-1`}
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => removeTag(index)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'content' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">文档摘要</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入文档的主要内容摘要..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">关键要点</label>
              <textarea
                value={formData.keyPoints}
                onChange={(e) => setFormData(prev => ({ ...prev, keyPoints: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="列出文档中的关键要点..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">相关条款</label>
              <textarea
                value={formData.relatedClauses}
                onChange={(e) => setFormData(prev => ({ ...prev, relatedClauses: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="列出相关的法律条款或合同条款..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">法律意义</label>
              <textarea
                value={formData.legalSignificance}
                onChange={(e) => setFormData(prev => ({ ...prev, legalSignificance: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="分析文档的法律意义和作用..."
              />
            </div>
          </div>
        )}

        {activeSection === 'evidence' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">证据类型</label>
                <select
                  value={formData.evidenceType}
                  onChange={(e) => setFormData(prev => ({ ...prev, evidenceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(evidenceTypes).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">真实性状态</label>
                <select
                  value={formData.authenticity}
                  onChange={(e) => setFormData(prev => ({ ...prev, authenticity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(authenticityLevels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">相关性评分 ({formData.relevanceScore}/10)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.relevanceScore}
                onChange={(e) => setFormData(prev => ({ ...prev, relevanceScore: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>低相关性</span>
                <span>高相关性</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{formData.relevanceScore}/10</div>
                <div className="text-sm text-gray-500">相关性评分</div>
              </Card>

              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formData.authenticity === 'verified' ? '✓' :
                    formData.authenticity === 'pending' ? '?' :
                      formData.authenticity === 'disputed' ? '!' : '✗'}
                </div>
                <div className="text-sm text-gray-500">真实性状态</div>
              </Card>

              <Card className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {confidentialityLevels[formData.confidentialityLevel as keyof typeof confidentialityLevels]}
                </div>
                <div className="text-sm text-gray-500">保密级别</div>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'versions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">版本历史</h3>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                添加版本
              </Button>
            </div>

            <div className="space-y-3">
              {formData.versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无版本记录</p>
                </div>
              ) : (
                formData.versions.map((version, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <span className="text-sm text-gray-500">{version.date}</span>
                      </div>
                      <span className="text-sm text-gray-600">{version.author}</span>
                    </div>
                    <p className="text-sm">{version.changes}</p>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </EditorModal>
  );
};
