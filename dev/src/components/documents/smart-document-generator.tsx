// dev/src/components/documents/smart-document-generator.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Save,
  Wand2,
  Copy,
  Printer,
  CheckCircle,
  AlertTriangle,
  Info,
  BookOpen,
  Scale,
  Gavel,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'complaint' | 'response' | 'application' | 'agreement' | 'decision' | 'notice';
  category: 'arbitration' | 'mediation' | 'judicial';
  description: string;
  fields: DocumentField[];
  template: string;
  isOfficial: boolean;
  lastUpdated: Date;
}

interface DocumentField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

interface SmartDocumentGeneratorProps {
  caseId?: string;
  onDocumentGenerated?: (documentId: string, content: string) => void;
  className?: string;
}

const officialTemplates: DocumentTemplate[] = [
  {
    id: 'complaint-template',
    name: '仲裁申请书',
    type: 'complaint',
    category: 'arbitration',
    description: '标准仲裁申请书模板，符合《仲裁法》规定格式',
    isOfficial: true,
    lastUpdated: new Date('2024-02-01'),
    fields: [
      {
        id: 'applicant_name',
        name: 'applicant_name',
        label: '申请人姓名/名称',
        type: 'text',
        required: true,
        placeholder: '请输入申请人姓名或企业名称'
      },
      {
        id: 'applicant_address',
        name: 'applicant_address',
        label: '申请人地址',
        type: 'textarea',
        required: true,
        placeholder: '请输入详细地址'
      },
      {
        id: 'applicant_contact',
        name: 'applicant_contact',
        label: '联系方式',
        type: 'text',
        required: true,
        placeholder: '电话号码或邮箱'
      },
      {
        id: 'respondent_name',
        name: 'respondent_name',
        label: '被申请人姓名/名称',
        type: 'text',
        required: true,
        placeholder: '请输入被申请人姓名或企业名称'
      },
      {
        id: 'respondent_address',
        name: 'respondent_address',
        label: '被申请人地址',
        type: 'textarea',
        required: true,
        placeholder: '请输入详细地址'
      },
      {
        id: 'dispute_facts',
        name: 'dispute_facts',
        label: '争议事实和理由',
        type: 'textarea',
        required: true,
        placeholder: '请详细描述争议的事实经过和法律依据'
      },
      {
        id: 'arbitration_request',
        name: 'arbitration_request',
        label: '仲裁请求',
        type: 'textarea',
        required: true,
        placeholder: '请明确列出具体的仲裁请求事项'
      },
      {
        id: 'evidence_list',
        name: 'evidence_list',
        label: '证据清单',
        type: 'textarea',
        required: false,
        placeholder: '请列出相关证据材料'
      }
    ],
    template: `仲裁申请书

申请人：{{applicant_name}}
地址：{{applicant_address}}
联系方式：{{applicant_contact}}

被申请人：{{respondent_name}}
地址：{{respondent_address}}

争议事实和理由：
{{dispute_facts}}

仲裁请求：
{{arbitration_request}}

证据清单：
{{evidence_list}}

此致
北京仲裁委员会

申请人：{{applicant_name}}
日期：{{current_date}}`
  },
  {
    id: 'response-template',
    name: '仲裁答辩书',
    type: 'response',
    category: 'arbitration',
    description: '标准仲裁答辩书模板，符合法定格式要求',
    isOfficial: true,
    lastUpdated: new Date('2024-02-01'),
    fields: [
      {
        id: 'respondent_name',
        name: 'respondent_name',
        label: '被申请人姓名/名称',
        type: 'text',
        required: true
      },
      {
        id: 'case_number',
        name: 'case_number',
        label: '案件编号',
        type: 'text',
        required: true
      },
      {
        id: 'defense_opinion',
        name: 'defense_opinion',
        label: '答辩意见',
        type: 'textarea',
        required: true,
        placeholder: '请详细阐述对申请人请求的答辩意见'
      },
      {
        id: 'counter_facts',
        name: 'counter_facts',
        label: '反驳事实',
        type: 'textarea',
        required: false,
        placeholder: '如有不同意见，请提供相关事实'
      },
      {
        id: 'counter_evidence',
        name: 'counter_evidence',
        label: '反驳证据',
        type: 'textarea',
        required: false,
        placeholder: '请列出支持答辩意见的证据'
      }
    ],
    template: `仲裁答辩书

案件编号：{{case_number}}

被申请人：{{respondent_name}}

答辩意见：
{{defense_opinion}}

事实和理由：
{{counter_facts}}

证据清单：
{{counter_evidence}}

此致
北京仲裁委员会

被申请人：{{respondent_name}}
日期：{{current_date}}`
  }
];

export function SmartDocumentGenerator({
  caseId,
  onDocumentGenerated,
  className
}: SmartDocumentGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  type SmartDocumentTab = 'templates' | 'generator' | 'preview';
  const isSmartDocumentTab = (value: string): value is SmartDocumentTab => {
    return value === 'templates' || value === 'generator' || value === 'preview';
  };
  const [activeTab, setActiveTab] = useState<SmartDocumentTab>('templates');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setGeneratedContent('');
    setActiveTab('generator');
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateForm = () => {
    if (!selectedTemplate) return false;
    
    for (const field of selectedTemplate.fields) {
      if (field.required && !formData[field.id]) {
        return false;
      }
    }
    return true;
  };

  const generateDocument = () => {
    if (!selectedTemplate || !validateForm()) return;

    setIsGenerating(true);
    
    // 模拟AI生成过程
    setTimeout(() => {
      let content = selectedTemplate.template;
      
      // 替换模板变量
    Object.entries(formData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value ?? ''));
    });
      
      // 添加当前日期
      const currentDate = new Date().toLocaleDateString('zh-CN');
      content = content.replace(/{{current_date}}/g, currentDate);
      
      setGeneratedContent(content);
      setActiveTab('preview');
      setIsGenerating(false);
    }, 2000);
  };

  const handleSaveDocument = () => {
    if (!generatedContent) return;
    
    const documentId = `doc-${Date.now()}`;
    onDocumentGenerated?.(documentId, generatedContent);
    
    // 这里可以添加保存到后端的逻辑
    console.log('文档已保存:', documentId);
  };

  const getTemplateIcon = (type: DocumentTemplate['type']) => {
    const icons = {
      complaint: <FileText className="h-5 w-5" />,
      response: <Scale className="h-5 w-5" />,
      application: <BookOpen className="h-5 w-5" />,
      agreement: <Users className="h-5 w-5" />,
      decision: <Gavel className="h-5 w-5" />,
      notice: <Info className="h-5 w-5" />
    };
    return icons[type];
  };

  const getTemplateColor = (category: DocumentTemplate['category']) => {
    const colors = {
      arbitration: 'border-blue-200 bg-blue-50',
      mediation: 'border-green-200 bg-green-50',
      judicial: 'border-purple-200 bg-purple-50'
    };
    return colors[category];
  };

  const renderField = (field: DocumentField) => {
    const rawValue = formData[field.id];
    const stringValue =
      typeof rawValue === 'string'
        ? rawValue
        : typeof rawValue === 'number'
          ? String(rawValue)
          : '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={stringValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={stringValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <Select
            value={stringValue}
            onValueChange={(val) => handleFieldChange(field.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={stringValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      case 'checkbox':
        const checked = typeof rawValue === 'boolean' ? rawValue : false;
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={checked}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label>{field.placeholder}</Label>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wand2 className="h-6 w-6" />
            智能文书生成
          </h2>
          <p className="text-gray-600 mt-1">基于官方标准格式，智能生成各类法律文书</p>
        </div>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardHeader>
          <CardTitle>文书生成器</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => {
              if (!isSmartDocumentTab(value)) return;
              setActiveTab(value);
            }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">选择模板</TabsTrigger>
              <TabsTrigger value="generator" disabled={!selectedTemplate}>填写内容</TabsTrigger>
              <TabsTrigger value="preview" disabled={!generatedContent}>预览文档</TabsTrigger>
            </TabsList>

            {/* 模板选择标签页 */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {officialTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                    } ${getTemplateColor(template.category)}`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getTemplateIcon(template.type)}
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {template.isOfficial && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              官方标准
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {template.category === 'arbitration' ? '仲裁' :
                             template.category === 'mediation' ? '调解' : '司法'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        最后更新：{template.lastUpdated.toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 内容填写标签页 */}
            <TabsContent value="generator" className="space-y-4">
              {selectedTemplate && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      请填写以下信息，系统将根据官方标准格式自动生成文书。标有 * 的字段为必填项。
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('templates')}>
                      返回选择
                    </Button>
                    <Button 
                      onClick={generateDocument}
                      disabled={!validateForm() || isGenerating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          生成中...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          生成文书
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* 预览标签页 */}
            <TabsContent value="preview" className="space-y-4">
              {generatedContent && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">文书预览</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        编辑
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        复制
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        打印
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        下载
                      </Button>
                      <Button onClick={handleSaveDocument} className="bg-green-600 hover:bg-green-700">
                        <Save className="h-4 w-4 mr-2" />
                        保存文档
                      </Button>
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-6">
                      <div className="bg-white border rounded-lg p-8 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {generatedContent}
                      </div>
                    </CardContent>
                  </Card>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      文书已按照官方标准格式生成。请仔细核对内容，确认无误后保存或下载。
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
