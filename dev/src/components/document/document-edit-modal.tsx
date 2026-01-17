// dev/src/components/document/document-edit-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Tag, Calendar, User, FileType, Save, X } from 'lucide-react';

type EditableDocument = {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  priority?: string;
  notes?: string;
  version?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

interface DocumentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: EditableDocument | null;
  onSave: (updatedDocument: EditableDocument) => void;
}

export function DocumentEditModal({ isOpen, onClose, document, onSave }: DocumentEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: [] as string[],
    priority: 'normal',
    notes: '',
    version: '1.0'
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (document) {
      setFormData({
        name: document.name || '',
        description: document.description || '',
        category: document.category || '',
        tags: document.tags || [],
        priority: document.priority || 'normal',
        notes: document.notes || '',
        version: document.version || '1.0'
      });
    }
  }, [document]);

  const handleSave = () => {
    const updatedDocument: EditableDocument = {
      ...(document ?? {}),
      ...formData,
      updatedAt: new Date().toISOString()
    };
    onSave(updatedDocument);
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const documentCategories = [
    { value: 'contract', label: '合同文件' },
    { value: 'evidence', label: '证据材料' },
    { value: 'legal', label: '法律文书' },
    { value: 'correspondence', label: '往来函件' },
    { value: 'financial', label: '财务文件' },
    { value: 'technical', label: '技术文档' },
    { value: 'other', label: '其他' }
  ];

  const priorityOptions = [
    { value: 'low', label: '低', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: '普通', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: '高', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: '紧急', color: 'bg-red-100 text-red-800' }
    ];

    if (!document) return null;

    const rawType = (document as { type?: unknown }).type;
    const documentType = typeof rawType === 'string' && rawType.trim() ? rawType : 'PDF';

    const rawSize = (document as { size?: unknown }).size;
    const documentSize =
      typeof rawSize === 'string' && rawSize.trim()
        ? rawSize
        : typeof rawSize === 'number' && Number.isFinite(rawSize)
          ? `${(rawSize / 1024 / 1024).toFixed(1)} MB`
          : '2.5 MB';

    const rawCreatedAt = (document as { createdAt?: unknown }).createdAt;
    const createdAtDate =
      rawCreatedAt instanceof Date
        ? rawCreatedAt
        : typeof rawCreatedAt === 'string' || typeof rawCreatedAt === 'number'
          ? new Date(rawCreatedAt)
          : new Date();

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            编辑文档信息
          </DialogTitle>
          <DialogDescription>
            修改文档的基本信息、分类和标签
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-name">文档名称</Label>
                <Input
                  id="doc-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入文档名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-description">文档描述</Label>
                <Textarea
                  id="doc-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请输入文档描述..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-category">文档分类</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doc-priority">优先级</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={option.color}>{option.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 标签管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag className="h-4 w-4" />
                标签管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入新标签..."
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} size="sm">
                  添加
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-600" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 备注信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">备注信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="doc-notes">备注</Label>
                <Textarea
                  id="doc-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="添加备注信息..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 文档信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">文档信息</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-gray-500">文件类型</Label>
                    <p className="font-medium">{documentType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">文件大小</Label>
                    <p className="font-medium">{documentSize}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">创建时间</Label>
                    <p className="font-medium">{createdAtDate.toLocaleDateString()}</p>
                  </div>
                <div>
                  <Label className="text-xs text-gray-500">版本号</Label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
