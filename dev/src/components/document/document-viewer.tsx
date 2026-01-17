// src/components/document/document-viewer.tsx
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Download, 
  Edit, 
  Save, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Tag,
  MessageSquare,
  Plus,
  Eye,
  Printer,
  Share2
} from 'lucide-react';

type ViewerDocument = {
  id: string;
  name: string;
  type: string;
  size: string;
  url?: string;
  content?: string;
  tags: string[];
  notes: string[];
  uploadedAt: string;
};

interface DocumentViewerProps {
  document: ViewerDocument;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (document: ViewerDocument) => void;
}

interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  page?: number;
  position?: { x: number; y: number };
}

export function DocumentViewer({ document, isOpen, onClose, onUpdate }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document.content || '');
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [tags, setTags] = useState(document.tags || []);
  const [notes, setNotes] = useState<Note[]>(
    document.notes?.map((note, index) => ({
      id: `note-${index}`,
      content: note,
      author: '当前用户',
      createdAt: new Date().toISOString()
    })) || []
  );

  // 添加标签
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      
      if (onUpdate) {
        onUpdate({ ...document, tags: updatedTags });
      }
    }
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    if (onUpdate) {
      onUpdate({ ...document, tags: updatedTags });
    }
  };

  // 添加备注
  const addNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: `note-${Date.now()}`,
        content: newNote.trim(),
        author: '当前用户',
        createdAt: new Date().toISOString()
      };
      
      const updatedNotes = [...notes, note];
      setNotes(updatedNotes);
      setNewNote('');
      
      if (onUpdate) {
        onUpdate({ 
          ...document, 
          notes: updatedNotes.map(n => n.content)
        });
      }
    }
  };

  // 删除备注
  const removeNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    
    if (onUpdate) {
      onUpdate({ 
        ...document, 
        notes: updatedNotes.map(n => n.content)
      });
    }
  };

  // 保存编辑
  const saveEdit = () => {
    if (onUpdate) {
      onUpdate({ ...document, content: editedContent });
    }
    setIsEditing(false);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditedContent(document.content || '');
    setIsEditing(false);
  };

  // 缩放控制
  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      if (direction === 'in') {
        return Math.min(prev + 25, 200);
      } else {
        return Math.max(prev - 25, 50);
      }
    });
  };

  // 旋转控制
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // 获取文件类型图标
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('image')) return '🖼️';
    return '📁';
  };

  // 渲染文档内容
  const renderDocumentContent = () => {
    if (document.type.includes('image')) {
      return (
        <div className="flex justify-center items-center h-full bg-gray-100">
          <img
            src={document.url || '/images/placeholder-image.jpg'}
            alt={document.name}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: '100%',
              transition: 'transform 0.3s ease'
            }}
          />
        </div>
      );
    }

    if (document.type.includes('pdf')) {
      return (
        <div className="flex justify-center items-center h-full bg-gray-100">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">PDF预览功能开发中</p>
            <p className="text-sm text-gray-500 mt-2">
              请下载文件查看完整内容
            </p>
          </div>
        </div>
      );
    }

    // 文本内容
    if (isEditing) {
      return (
        <div className="h-full p-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full resize-none"
            placeholder="输入文档内容..."
          />
        </div>
      );
    }

    return (
      <div className="h-full p-4 bg-white">
        <div 
          style={{ 
            fontSize: `${zoom}%`,
            transform: `rotate(${rotation}deg)`,
            transition: 'all 0.3s ease'
          }}
          className="whitespace-pre-wrap"
        >
          {document.content || '暂无内容'}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getFileIcon(document.type)}</span>
              <div>
                <h3 className="text-lg font-semibold">{document.name}</h3>
                <p className="text-sm text-gray-500">
                  {document.size} • {document.uploadedAt}
                </p>
              </div>
            </div>
            
            {/* 工具栏 */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="w-4 h-4" />
              </Button>
              
              {document.type.includes('text') && (
                <>
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={saveEdit}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </>
              )}
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* 主要内容区域 */}
          <div className="flex-1 border-r">
            <ScrollArea className="h-full">
              {renderDocumentContent()}
            </ScrollArea>
          </div>

          {/* 侧边栏 - 标签和备注 */}
          <div className="w-80 bg-gray-50">
            <Tabs defaultValue="tags" className="h-full">
              <TabsList className="grid w-full grid-cols-2 m-2">
                <TabsTrigger value="tags">标签</TabsTrigger>
                <TabsTrigger value="notes">备注</TabsTrigger>
              </TabsList>

              <TabsContent value="tags" className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">文档标签</h4>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="添加标签"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100"
                        onClick={() => removeTag(tag)}
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  
                  {tags.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      暂无标签
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">文档备注</h4>
                  <div className="space-y-2 mb-3">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="添加备注..."
                      rows={3}
                    />
                    <Button size="sm" onClick={addNote} className="w-full">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      添加备注
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-500">{note.author}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNote(note.id)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(note.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {notes.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      暂无备注
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
