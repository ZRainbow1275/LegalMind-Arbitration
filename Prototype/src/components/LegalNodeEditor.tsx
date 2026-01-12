import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

import {
  Scale,
  Users,
  FileText,
  Calendar,
  MessageSquare,
  Target,
  X,
  Save,
  Trash2,
  Plus,
  Edit3
} from 'lucide-react';
import { LegalNode } from './DrawnixLegalWorkspace';
import { CaseInfoEditor } from './editors/CaseInfoEditor';
import { PersonEditor } from './editors/PersonEditor';
import { DocumentEditor } from './editors/DocumentEditor';
import { HearingEditor } from './editors/HearingEditor';
import { TimelineEditor } from './editors/TimelineEditor'; // {{ AURA: Add - 时间轴编辑器 }}
import { MediationEditor } from './editors/MediationEditor'; // {{ AURA: Add - 调解记录编辑器 }}

interface LegalNodeEditorProps {
  node: LegalNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<LegalNode>) => void;
  onDelete: (nodeId: string) => void;
}

export const LegalNodeEditor: React.FC<LegalNodeEditorProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [editedNode, setEditedNode] = useState<LegalNode | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'metadata' | 'connections'>('basic');

  useEffect(() => {
    if (node) {
      setEditedNode({ ...node });
    }
  }, [node]);

  if (!isOpen || !node || !editedNode) return null;

  // 根据节点类型使用专门的编辑器
  const handleSaveWrapper = (updates: Partial<LegalNode>) => {
    onSave(node.id, updates);
  };

  // 案件信息节点使用专门的编辑器
  if (node.type === 'legal-case') {
    return (
      <CaseInfoEditor
        node={node}
        onSave={handleSaveWrapper}
        onClose={onClose}
      />
    );
  }

  // 当事人节点使用专门的编辑器
  if (node.type === 'legal-person') {
    return (
      <PersonEditor
        node={node}
        onSave={handleSaveWrapper}
        onClose={onClose}
      />
    );
  }

  // 文档证据节点使用专门的编辑器
  if (node.type === 'legal-document') {
    return (
      <DocumentEditor
        node={node}
        onSave={handleSaveWrapper}
        onClose={onClose}
      />
    );
  }

  // 庭审安排节点使用专门的编辑器
  if (node.type === 'legal-hearing') {
    return (
      <HearingEditor
        node={node}
        onSave={handleSaveWrapper}
        onClose={onClose}
      />
    );
  }

  // {{ AURA: Add - 时间轴节点使用专门的编辑器 }}
  if (node.type === 'legal-timeline') {
    return (
      <TimelineEditor
        node={node}
        onSave={handleSaveWrapper}
        onClose={onClose}
      />
    );
  }

  // {{ AURA: Add - 调解记录节点使用专门的编辑器 }}
  if (node.type === 'legal-mediation') {
    return (
      <MediationEditor
        node={node}
        onSave={handleSaveWrapper}
        onClose={onClose}
      />
    );
  }

  // 其他节点类型使用通用编辑器

  const nodeTypeConfig = {
    'legal-case': { icon: Scale, color: 'bg-blue-500', label: '案件信息' },
    'legal-person': { icon: Users, color: 'bg-green-500', label: '当事人' },
    'legal-document': { icon: FileText, color: 'bg-purple-500', label: '文档证据' },
    'legal-hearing': { icon: Calendar, color: 'bg-orange-500', label: '庭审安排' },
    'legal-mediation': { icon: MessageSquare, color: 'bg-yellow-500', label: '调解记录' },
    'legal-timeline': { icon: Target, color: 'bg-red-500', label: '时间轴' },
    'legal-chat-note': { icon: MessageSquare, color: 'bg-indigo-500', label: '聊天对话' }, // {{ AURA: Add - 聊天贴节点配置 }}
  };

  const config = (nodeTypeConfig as any)[node.type] || nodeTypeConfig['legal-case']; // {{ AURA: Fix - 添加默认配置，避免undefined错误 }}
  const IconComponent = config.icon;

  const handleSave = () => {
    onSave(editedNode.id, editedNode);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('确定要删除这个节点吗？此操作不可撤销。')) {
      onDelete(editedNode.id);
      onClose();
    }
  };

  const updateNodeData = (field: string, value: any) => {
    setEditedNode(prev => prev ? {
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      }
    } : null);
  };

  const updateMetadata = (key: string, value: any) => {
    setEditedNode(prev => prev ? {
      ...prev,
      data: {
        ...prev.data,
        metadata: {
          ...prev.data.metadata,
          [key]: value
        }
      }
    } : null);
  };

  const renderBasicTab = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          节点标题
        </label>
        <input
          type="text"
          value={editedNode.data.title}
          onChange={(e) => updateNodeData('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="输入节点标题"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          详细描述
        </label>
        <textarea
          value={editedNode.data.description}
          onChange={(e) => updateNodeData('description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="输入详细描述"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          状态
        </label>
        <select
          value={editedNode.data.status}
          onChange={(e) => updateNodeData('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="pending">待处理</option>
          <option value="active">进行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          位置坐标
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={editedNode.data.position.x}
            onChange={(e) => updateNodeData('position', {
              ...editedNode.data.position,
              x: parseInt(e.target.value) || 0
            })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="X坐标"
          />
          <input
            type="number"
            value={editedNode.data.position.y}
            onChange={(e) => updateNodeData('position', {
              ...editedNode.data.position,
              y: parseInt(e.target.value) || 0
            })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Y坐标"
          />
        </div>
      </div>
    </div>
  );

  const renderMetadataTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">元数据字段</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const key = prompt('请输入字段名称:');
            if (key) {
              updateMetadata(key, '');
            }
          }}
          className="border-orange-200 hover:border-orange-400"
        >
          <Plus className="w-4 h-4" />
          添加字段
        </Button>
      </div>

      <div className="space-y-3">
        {Object.entries(editedNode.data.metadata).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="text"
              value={key}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={String(value)}
              onChange={(e) => updateMetadata(key, e.target.value)}
              className="flex-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              placeholder="字段值"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const newMetadata = { ...editedNode.data.metadata };
                delete (newMetadata as any)[key];
                setEditedNode(prev => prev ? {
                  ...prev,
                  data: {
                    ...prev.data,
                    metadata: newMetadata
                  }
                } : null);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {Object.keys(editedNode.data.metadata).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无元数据字段</p>
          <p className="text-xs">点击"添加字段"来创建自定义属性</p>
        </div>
      )}
    </div>
  );

  const renderConnectionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">节点连接</h4>
        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
          {editedNode.data.connections.length} 个连接
        </Badge>
      </div>

      <div className="space-y-2">
        {editedNode.data.connections.map((connectionId, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">连接到: {connectionId}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const newConnections = editedNode.data.connections.filter((_, i) => i !== index);
                updateNodeData('connections', newConnections);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {editedNode.data.connections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无连接</p>
          <p className="text-xs">在画布上拖拽连接线来创建节点关系</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-800">
                  编辑{config.label}
                </CardTitle>
                <p className="text-sm text-gray-500">ID: {node.id}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 标签页导航 */}
          <div className="flex gap-1 mt-4">
            {[
              { id: 'basic', label: '基本信息', icon: Edit3 },
              { id: 'metadata', label: '元数据', icon: FileText },
              { id: 'connections', label: '连接关系', icon: Target }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center gap-2"
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'metadata' && renderMetadataTab()}
          {activeTab === 'connections' && renderConnectionsTab()}
        </CardContent>

        <div className="border-t border-gray-200 p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleDelete}
            className="border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除节点
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-200 hover:border-gray-400"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Save className="w-4 h-4 mr-2" />
              保存更改
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
