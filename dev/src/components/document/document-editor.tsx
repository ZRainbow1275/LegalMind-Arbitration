// src/components/document/document-editor.tsx
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Download, 
  FileText, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Type,
  Palette
} from 'lucide-react';

type EditorDocument = {
  id?: string;
  name: string;
  content: string;
  type: string;
};

interface DocumentEditorProps {
  initialDocument?: EditorDocument;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (document: EditorDocument) => void;
}

export function DocumentEditor({
  initialDocument,
  isOpen,
  onClose,
  onSave,
}: DocumentEditorProps) {
  const [documentName, setDocumentName] = useState(initialDocument?.name || '新建文档');
  const [content, setContent] = useState(initialDocument?.content || '');
  const [fontSize, setFontSize] = useState('14');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // 格式化命令
  const formatText = (command: string, value?: string) => {
    if (editorRef.current) {
      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      
      let formattedText = selectedText;
      
      switch (command) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'underline':
          formattedText = `<u>${selectedText}</u>`;
          break;
        case 'heading1':
          formattedText = `# ${selectedText}`;
          break;
        case 'heading2':
          formattedText = `## ${selectedText}`;
          break;
        case 'heading3':
          formattedText = `### ${selectedText}`;
          break;
        case 'bullet':
          formattedText = `• ${selectedText}`;
          break;
        case 'number':
          formattedText = `1. ${selectedText}`;
          break;
        default:
          break;
      }
      
      const newContent = content.substring(0, start) + formattedText + content.substring(end);
      setContent(newContent);
      
      // 重新设置光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + formattedText.length);
      }, 0);
    }
  };

  // 插入模板
  const insertTemplate = (templateType: string) => {
    let template = '';
    
    switch (templateType) {
      case 'contract':
        template = `
# 合同模板

**甲方**：
**乙方**：

## 第一条 合同目的

## 第二条 合同内容

## 第三条 权利义务

## 第四条 违约责任

## 第五条 争议解决

## 第六条 其他条款

**甲方签字**：_________________ **日期**：_________

**乙方签字**：_________________ **日期**：_________
        `;
        break;
      case 'application':
        template = `
# 仲裁申请书

**申请人**：
**被申请人**：

## 仲裁请求

## 事实与理由

## 证据清单

**申请人签字**：_________________ **日期**：_________
        `;
        break;
      case 'response':
        template = `
# 答辩书

**被申请人**：
**申请人**：

## 答辩意见

## 事实与理由

## 反驳证据

**被申请人签字**：_________________ **日期**：_________
        `;
        break;
      default:
        template = '请选择模板类型';
    }
    
    setContent(template.trim());
  };

  // 保存文档
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const documentData = {
        id: initialDocument?.id || `doc-${Date.now()}`,
        name: documentName,
        content,
        type: 'text/plain',
        size: `${(content.length / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toISOString().split('T')[0],
        tags: [],
        notes: []
      };
      
      if (onSave) {
        await onSave(documentData);
      }
      
      // 模拟保存延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('文档保存成功！');
    } catch (error) {
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 下载文档
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6" />
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className="text-lg font-semibold border-none p-0 h-auto"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6">
          {/* 工具栏 */}
          <div className="border rounded-lg p-3 mb-4 bg-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 字体设置 */}
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="SimSun">宋体</SelectItem>
                  <SelectItem value="SimHei">黑体</SelectItem>
                  <SelectItem value="KaiTi">楷体</SelectItem>
                </SelectContent>
              </Select>

              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12px</SelectItem>
                  <SelectItem value="14">14px</SelectItem>
                  <SelectItem value="16">16px</SelectItem>
                  <SelectItem value="18">18px</SelectItem>
                  <SelectItem value="20">20px</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-6" />

              {/* 格式化按钮 */}
              <Button variant="outline" size="sm" onClick={() => formatText('bold')}>
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => formatText('italic')}>
                <Italic className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => formatText('underline')}>
                <Underline className="w-4 h-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* 对齐按钮 */}
              <Button variant="outline" size="sm">
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <AlignRight className="w-4 h-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* 列表按钮 */}
              <Button variant="outline" size="sm" onClick={() => formatText('bullet')}>
                <List className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => formatText('number')}>
                <ListOrdered className="w-4 h-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* 模板选择 */}
              <Select onValueChange={insertTemplate}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="插入模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">合同模板</SelectItem>
                  <SelectItem value="application">申请书模板</SelectItem>
                  <SelectItem value="response">答辩书模板</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 编辑器 */}
          <div className="border rounded-lg overflow-hidden">
            <Textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="开始编写您的文档..."
              className="min-h-[500px] border-none resize-none focus:ring-0"
              style={{
                fontFamily,
                fontSize: `${fontSize}px`,
                lineHeight: '1.6'
              }}
            />
          </div>

          {/* 状态栏 */}
          <div className="flex justify-between items-center py-3 text-sm text-gray-500">
            <div>
              字符数: {content.length} | 行数: {content.split('\n').length}
            </div>
            <div>
              {initialDocument?.id ? '编辑模式' : '新建文档'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
