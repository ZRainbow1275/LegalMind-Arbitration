// src/app/(private)/arbitrator/cases/[id]/award-editor/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  Save, 
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Quote,
  Brain,
  Wand2
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// 裁决书大纲结构
const awardOutline = [
  { id: 'header', title: '案件基本信息', completed: true },
  { id: 'parties', title: '当事人信息', completed: true },
  { id: 'claims', title: '仲裁请求', completed: true },
  { id: 'facts', title: '事实认定', completed: false, current: true },
  { id: 'analysis', title: '本庭认为', completed: false },
  { id: 'decision', title: '裁决结果', completed: false },
  { id: 'costs', title: '仲裁费用', completed: false },
  { id: 'enforcement', title: '执行条款', completed: false }
];

// 模拟AI建议
const aiSuggestions = [
  {
    id: 'fact-fill',
    type: 'auto-fill',
    title: '一键填充事实',
    description: '基于案件材料自动提取无争议事实',
    icon: Wand2,
    color: 'text-blue-600'
  },
  {
    id: 'smart-quote',
    type: 'reference',
    title: '智能引用',
    description: '自动引用相关证据和法条',
    icon: Quote,
    color: 'text-green-600'
  },
  {
    id: 'logic-check',
    type: 'validation',
    title: '逻辑检查',
    description: '检查论述逻辑和裁决一致性',
    icon: Brain,
    color: 'text-purple-600'
  }
];

export default function AwardEditorPage() {
  const params = useParams<{ id: string }>();
  const caseId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const [selectedSection, setSelectedSection] = useState('facts');
  const [editorContent, setEditorContent] = useState('');
  const [aiAssistantOpen, setAiAssistantOpen] = useState(true);

  const handleAIAction = (actionId: string) => {
    switch (actionId) {
      case 'fact-fill':
        setEditorContent(prev => prev + '\n\n根据案件材料，以下事实双方均无争议：\n1. 双方于2023年6月15日签署了《软件开发合同》\n2. 合同约定开发周期为6个月\n3. 申请人已支付首期款项50万元\n4. 被申请人于2023年12月提交了软件初版');
        break;
      case 'smart-quote':
        alert('智能引用功能：选中文字后可快速引用证据A、庭审笔录等');
        break;
      case 'logic-check':
        alert('AI提示：当前论述理由与最终裁决结果在逻辑上保持一致。');
        break;
    }
  };

  const getSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'facts':
        return '请在此处填写事实认定内容...';
      case 'analysis':
        return '请在此处填写本庭认为的分析内容...';
      case 'decision':
        return '请在此处填写裁决结果...';
      default:
        return '请选择左侧章节进行编辑...';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 max-w-7xl animate-fade-in">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex items-center space-x-4">
            <Link href={`/arbitrator/cases/${caseId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回案件详情
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">裁决书智能编辑器</h1>
              <p className="text-gray-600 mt-1">ARB-2024-010 - 软件开发合同争议案</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" className="hover-lift">
              <Save className="h-5 w-5 mr-2" />
              保存草稿
            </Button>
            <Button variant="outline" size="lg" className="hover-lift">
              <Eye className="h-5 w-5 mr-2" />
              预览
            </Button>
            <Button size="lg" className="btn-primary btn-ripple hover-lift shadow-brand">
              <Download className="h-5 w-5 mr-2" />
              导出裁决书
            </Button>
          </div>
        </div>

        {/* 主要编辑区域 */}
        <div className="grid grid-cols-12 gap-8">
          {/* 左侧大纲 */}
          <div className="col-span-3">
            <Card className="sticky top-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <span>裁决书大纲</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {awardOutline.map((section) => (
                  <div
                    key={section.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedSection === section.id
                        ? 'bg-orange-50 border border-orange-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        selectedSection === section.id ? 'text-orange-700' : 'text-gray-700'
                      }`}>
                        {section.title}
                      </span>
                      <div className="flex items-center space-x-1">
                        {section.completed && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {section.current && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 中间编辑器 */}
          <div className="col-span-6">
            <Card className="animate-slide-up" style={{animationDelay: '0.2s'}}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {awardOutline.find(s => s.id === selectedSection)?.title || '编辑区域'}
                </CardTitle>
                <CardDescription>
                  使用AI助手帮助您快速完成裁决书的撰写
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* AI工具栏 */}
                  <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">AI助手工具</span>
                    <div className="flex items-center space-x-2 ml-auto">
                      {aiSuggestions.map((suggestion) => {
                        const IconComponent = suggestion.icon;
                        return (
                          <Button
                            key={suggestion.id}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAIAction(suggestion.id)}
                            className="hover:bg-white"
                          >
                            <IconComponent className={`h-4 w-4 mr-1 ${suggestion.color}`} />
                            <span className="text-xs">{suggestion.title}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 富文本编辑器 */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="border-b border-gray-200 p-3 bg-gray-50">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>格式：</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2">B</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">I</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">U</Button>
                        <Separator orientation="vertical" className="h-4" />
                        <Button variant="ghost" size="sm" className="h-6 px-2">引用</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">编号</Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder={getSectionContent(selectedSection)}
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      className="min-h-96 border-0 resize-none focus:ring-0"
                    />
                  </div>

                  {/* AI提示区域 */}
                  {selectedSection === 'analysis' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Lightbulb className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-green-800">AI提示</h4>
                          <p className="text-sm text-green-700 mt-1">
                            当前论述理由与最终裁决结果在逻辑上保持一致。建议在此章节中详细分析双方争议焦点。
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧AI助手 */}
          <div className="col-span-3">
            {aiAssistantOpen && (
              <Card className="sticky top-8 animate-slide-up" style={{animationDelay: '0.3s'}}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span>AI助手</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAiAssistantOpen(false)}
                    >
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiSuggestions.map((suggestion) => {
                    const IconComponent = suggestion.icon;
                    return (
                      <div
                        key={suggestion.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-200 hover:bg-purple-50 cursor-pointer transition-all duration-200"
                        onClick={() => handleAIAction(suggestion.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <IconComponent className={`h-4 w-4 ${suggestion.color}`} />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{suggestion.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">快速操作</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        插入法条引用
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Quote className="h-4 w-4 mr-2" />
                        引用证据材料
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        检查格式规范
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
