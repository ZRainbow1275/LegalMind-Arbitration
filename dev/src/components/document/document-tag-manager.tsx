// src/components/document/document-tag-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Tag, 
  Plus, 
  X, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Settings,
  Palette
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useNotificationHelpers } from '@/components/ui/notification';

interface DocumentTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  count: number; // 使用此标签的文档数量
  createdAt: string;
}

interface DocumentTagManagerProps {
  tags: DocumentTag[];
  onTagCreate?: (tag: Omit<DocumentTag, 'id' | 'count' | 'createdAt'>) => void;
  onTagUpdate?: (tagId: string, updates: Partial<DocumentTag>) => void;
  onTagDelete?: (tagId: string) => void;
  onTagFilter?: (tagIds: string[]) => void;
}

const predefinedColors = [
  { name: '蓝色', value: 'bg-blue-100 text-blue-800 border-blue-200' },
  { name: '绿色', value: 'bg-green-100 text-green-800 border-green-200' },
  { name: '红色', value: 'bg-red-100 text-red-800 border-red-200' },
  { name: '黄色', value: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { name: '紫色', value: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: '橙色', value: 'bg-orange-100 text-orange-800 border-orange-200' },
  { name: '粉色', value: 'bg-pink-100 text-pink-800 border-pink-200' },
  { name: '灰色', value: 'bg-gray-100 text-gray-800 border-gray-200' }
];

export function DocumentTagManager({ 
  tags, 
  onTagCreate, 
  onTagUpdate, 
  onTagDelete, 
  onTagFilter 
}: DocumentTagManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<DocumentTag | null>(null);
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const notify = useNotificationHelpers();
  
  // 新建标签表单
  const [newTagForm, setNewTagForm] = useState({
    name: '',
    color: predefinedColors[0].value,
    description: ''
  });

  // 过滤标签
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 创建标签
  const handleCreateTag = () => {
    if (newTagForm.name.trim()) {
      if (onTagCreate) {
        onTagCreate({
          name: newTagForm.name.trim(),
          color: newTagForm.color,
          description: newTagForm.description.trim() || undefined
        });
      }
      
      // 重置表单
      setNewTagForm({
        name: '',
        color: predefinedColors[0].value,
        description: ''
      });
      setShowCreateDialog(false);
    }
  };

  // 更新标签
  const handleUpdateTag = () => {
    if (editingTag && onTagUpdate) {
      onTagUpdate(editingTag.id, {
        name: newTagForm.name,
        color: newTagForm.color,
        description: newTagForm.description || undefined
      });
      setEditingTag(null);
      setNewTagForm({
        name: '',
        color: predefinedColors[0].value,
        description: ''
      });
    }
  };

  // 删除标签
  const handleDeleteTag = (tagId: string) => {
    showConfirmation({
      title: '删除标签',
      message: '确定要删除这个标签吗？这将从所有文档中移除此标签。',
      type: 'danger',
      confirmText: '删除',
      onConfirm: () => {
        if (onTagDelete) {
          onTagDelete(tagId);
          notify.success('标签已删除');
        }
      }
    });
  };

  // 开始编辑标签
  const startEditTag = (tag: DocumentTag) => {
    setEditingTag(tag);
    setNewTagForm({
      name: tag.name,
      color: tag.color,
      description: tag.description || ''
    });
  };

  // 切换标签选择
  const toggleTagSelection = (tagId: string) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    setSelectedTags(newSelection);
    
    if (onTagFilter) {
      onTagFilter(newSelection);
    }
  };

  // 清除所有选择
  const clearSelection = () => {
    setSelectedTags([]);
    if (onTagFilter) {
      onTagFilter([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            标签管理
            <Badge variant="outline">{tags.length} 个标签</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedTags.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <Filter className="w-4 h-4 mr-2" />
                清除筛选 ({selectedTags.length})
              </Button>
            )}
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  新建标签
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTag ? '编辑标签' : '新建标签'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">标签名称</label>
                    <Input
                      value={newTagForm.name}
                      onChange={(e) => setNewTagForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入标签名称"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">标签颜色</label>
                    <div className="grid grid-cols-4 gap-2">
                      {predefinedColors.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => setNewTagForm(prev => ({ ...prev, color: color.value }))}
                          className={`p-2 rounded border-2 ${
                            newTagForm.color === color.value ? 'border-primary-500' : 'border-gray-200'
                          }`}
                        >
                          <div className={`w-full h-6 rounded ${color.value.split(' ')[0]}`} />
                          <span className="text-xs mt-1 block">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">描述（可选）</label>
                    <Input
                      value={newTagForm.description}
                      onChange={(e) => setNewTagForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="输入标签描述"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateDialog(false);
                        setEditingTag(null);
                        setNewTagForm({
                          name: '',
                          color: predefinedColors[0].value,
                          description: ''
                        });
                      }}
                    >
                      取消
                    </Button>
                    <Button 
                      onClick={editingTag ? handleUpdateTag : handleCreateTag}
                      disabled={!newTagForm.name.trim()}
                    >
                      {editingTag ? '更新' : '创建'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签..."
            className="pl-10"
          />
        </div>

        {/* 标签列表 */}
        <div className="space-y-2">
          {filteredTags.map(tag => (
            <div
              key={tag.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedTags.includes(tag.id) ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50'
              }`}
            >
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => toggleTagSelection(tag.id)}
              >
                <Badge className={tag.color}>
                  <Tag className="w-3 h-3 mr-1" />
                  {tag.name}
                </Badge>
                
                <div className="flex-1">
                  {tag.description && (
                    <p className="text-sm text-gray-600">{tag.description}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {tag.count} 个文档 • 创建于 {formatDate(tag.createdAt)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    startEditTag(tag);
                    setShowCreateDialog(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {filteredTags.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? (
                <>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>未找到匹配的标签</p>
                </>
              ) : (
                <>
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无标签</p>
                  <p className="text-sm mt-1">点击“新建标签”开始创建</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* 快速操作 */}
        {tags.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">快速筛选</h4>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 6).map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className={`cursor-pointer ${selectedTags.includes(tag.id) ? '' : tag.color}`}
                  onClick={() => toggleTagSelection(tag.id)}
                >
                  {tag.name} ({tag.count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* 确认对话框 */}
      <ConfirmationDialog />
    </Card>
  );
}
