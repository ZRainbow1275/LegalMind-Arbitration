// src/app/(private)/documents/generate/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  Download,
  Eye,
  Save,
  Wand2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import Link from 'next/link';

// 文书模板数据
const documentTemplates = [
  {
    id: 'application',
    name: '仲裁申请书',
    description: '向仲裁机构提交的正式仲裁申请',
    category: '申请文件',
    difficulty: 'medium',
    estimatedTime: '30分钟',
    fields: ['申请人信息', '被申请人信息', '仲裁请求', '事实与理由', '证据清单']
  },
  {
    id: 'defense',
    name: '答辩书',
    description: '被申请人对仲裁申请的回应',
    category: '答辩文件',
    difficulty: 'medium',
    estimatedTime: '25分钟',
    fields: ['被申请人信息', '答辩意见', '反驳理由', '反请求', '证据材料']
  },
  {
    id: 'evidence-list',
    name: '证据清单',
    description: '整理和提交的证据材料清单',
    category: '证据材料',
    difficulty: 'easy',
    estimatedTime: '15分钟',
    fields: ['证据编号', '证据名称', '证据来源', '证明目的', '备注说明']
  },
  {
    id: 'mediation-agreement',
    name: '调解协议书',
    description: '调解成功后签署的协议',
    category: '调解文件',
    difficulty: 'hard',
    estimatedTime: '45分钟',
    fields: ['当事人信息', '争议概述', '调解结果', '履行方式', '违约责任']
  },
  {
    id: 'award',
    name: '仲裁裁决书',
    description: '仲裁庭作出的最终裁决',
    category: '裁决文件',
    difficulty: 'hard',
    estimatedTime: '60分钟',
    fields: ['案件基本情况', '当事人主张', '争议焦点', '本庭认为', '裁决结果']
  },
  {
    id: 'enforcement',
    name: '强制执行申请书',
    description: '申请法院强制执行仲裁裁决',
    category: '执行文件',
    difficulty: 'medium',
    estimatedTime: '20分钟',
    fields: ['申请人信息', '被执行人信息', '执行依据', '执行请求', '财产线索']
  }
];

export default function DocumentGeneratePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [generationStep, setGenerationStep] = useState(1);
  interface FormDataShape {
    caseNumber?: string;
    caseType?: string;
    applicant?: string;
    respondent?: string;
    disputeAmount?: string | number;
    caseSummary?: string;
    [key: string]: string | number | undefined;
  }
  const [formData, setFormData] = useState<FormDataShape>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '复杂';
      default: return '未知';
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setActiveTab('generate');
    setGenerationStep(1);
    setFormData({});
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    // 模拟文书生成过程
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
    setGenerationStep(3);
  };

  const selectedTemplateData = documentTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="container mx-auto p-8 max-w-6xl animate-fade-in">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            智能文书生成
          </h1>
          <p className="text-lg text-gray-600">AI驱动的法律文书智能生成工具</p>
        </div>
        <Link href="/documents">
          <Button variant="outline" size="sm" className="hover-lift">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回文档管理
          </Button>
        </Link>
      </div>

      {/* 主要内容标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-slide-up" style={{animationDelay: '0.1s'}}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">选择模板</TabsTrigger>
          <TabsTrigger value="generate" disabled={!selectedTemplate}>生成文书</TabsTrigger>
          <TabsTrigger value="history">生成历史</TabsTrigger>
        </TabsList>

        {/* 模板选择标签页 */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>文书模板库</span>
              </CardTitle>
              <CardDescription>
                选择适合的文书模板开始生成
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documentTemplates.map((template, index) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 animate-fade-in"
                    style={{animationDelay: `${0.2 + index * 0.1}s`}}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <Badge className={getDifficultyColor(template.difficulty)}>
                          {getDifficultyText(template.difficulty)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">预计时间：</span>
                        <span className="font-medium">{template.estimatedTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">分类：</span>
                        <span className="font-medium">{template.category}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 mb-2 block">包含字段：</span>
                        <div className="flex flex-wrap gap-1">
                          {template.fields.slice(0, 3).map((field, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                          {template.fields.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.fields.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button className="w-full btn-primary mt-4">
                        <Wand2 className="h-4 w-4 mr-2" />
                        选择此模板
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 生成文书标签页 */}
        <TabsContent value="generate" className="space-y-6">
          {selectedTemplateData && (
            <>
              {/* 进度指示器 */}
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-gray-900 flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <Wand2 className="h-4 w-4 text-white" />
                      </div>
                      <span>生成 {selectedTemplateData.name}</span>
                    </CardTitle>
                    <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
                      步骤 {generationStep} / 3
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-center mb-6">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          step < generationStep ? 'bg-green-500 border-green-500 text-white shadow-lg' :
                          step === generationStep ? 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-500 text-white shadow-lg' :
                          'bg-white border-gray-300 text-gray-500'
                        }`}>
                          {step < generationStep ? <CheckCircle className="h-5 w-5" /> :
                           step === generationStep ? <Clock className="h-5 w-5" /> :
                           <span className="font-medium">{step}</span>}
                        </div>
                        {step < 3 && (
                          <div className={`w-20 h-1 mx-3 rounded-full transition-all duration-300 ${
                            step < generationStep ? 'bg-green-500' :
                            step === generationStep ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                            'bg-gray-300'
                          }`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className={generationStep >= 1 ? 'text-orange-600' : 'text-gray-500'}>填写信息</span>
                    <span className={generationStep >= 2 ? 'text-orange-600' : 'text-gray-500'}>AI生成</span>
                    <span className={generationStep >= 3 ? 'text-orange-600' : 'text-gray-500'}>预览下载</span>
                  </div>
                </CardContent>
              </Card>

              {/* 步骤1：填写信息 */}
              {generationStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>填写基本信息</CardTitle>
                    <CardDescription>
                      请填写生成 {selectedTemplateData.name} 所需的基本信息
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="case-number">案件编号</Label>
                        <Input
                          id="case-number"
                          placeholder="如：ARB-2024-001"
                          value={formData.caseNumber || ''}
                          onChange={(e) => setFormData({...formData, caseNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="case-type">案件类型</Label>
                        <Select value={formData.caseType || ''} onValueChange={(value) => setFormData({...formData, caseType: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择案件类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contract">合同纠纷</SelectItem>
                            <SelectItem value="investment">投资争议</SelectItem>
                            <SelectItem value="labor">劳动争议</SelectItem>
                            <SelectItem value="intellectual">知识产权</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="applicant">申请人</Label>
                        <Input
                          id="applicant"
                          placeholder="申请人姓名或公司名称"
                          value={formData.applicant || ''}
                          onChange={(e) => setFormData({...formData, applicant: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="respondent">被申请人</Label>
                        <Input
                          id="respondent"
                          placeholder="被申请人姓名或公司名称"
                          value={formData.respondent || ''}
                          onChange={(e) => setFormData({...formData, respondent: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dispute-amount">争议金额（元）</Label>
                      <Input
                        id="dispute-amount"
                        type="number"
                        placeholder="请输入争议金额"
                        value={formData.disputeAmount || ''}
                        onChange={(e) => setFormData({...formData, disputeAmount: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="case-summary">案件概述</Label>
                      <Textarea
                        id="case-summary"
                        placeholder="请简要描述案件的基本情况和争议焦点..."
                        className="min-h-32"
                        value={formData.caseSummary || ''}
                        onChange={(e) => setFormData({...formData, caseSummary: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button variant="outline" onClick={() => setActiveTab('templates')}>
                        重新选择模板
                      </Button>
                      <Button onClick={() => setGenerationStep(2)} className="btn-primary">
                        下一步：AI生成
                        <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 步骤2：AI生成 */}
              {generationStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-orange-500" />
                      <span>AI智能生成</span>
                    </CardTitle>
                    <CardDescription>
                      AI正在根据您提供的信息生成专业的法律文书
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!isGenerating ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">准备生成文书</h3>
                        <p className="text-gray-600 mb-6">
                          AI将基于您的信息生成专业的 {selectedTemplateData.name}
                        </p>
                        <Button onClick={handleGenerate} size="lg" className="btn-primary btn-ripple">
                          <Wand2 className="h-5 w-5 mr-2" />
                          开始AI生成
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="loading-spinner w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI生成中...</h3>
                        <p className="text-gray-600 mb-4">
                          正在分析您的信息并生成专业文书，请稍候
                        </p>
                        <div className="max-w-md mx-auto">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">预计还需 30 秒</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 步骤3：预览下载 */}
              {generationStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>生成完成</span>
                    </CardTitle>
                    <CardDescription>
                      您的 {selectedTemplateData.name} 已生成完成，请预览并下载
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <h4 className="font-medium text-green-900">文书生成成功！</h4>
                          <p className="text-sm text-green-700">
                            AI已根据您的信息生成了专业的 {selectedTemplateData.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">文档预览</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-blue-100 text-blue-800">PDF格式</Badge>
                          <Badge className="bg-green-100 text-green-800">15页</Badge>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-64 flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedTemplateData.name}</h3>
                          <p className="text-gray-600 mb-4">
                            案件编号：{formData.caseNumber || 'ARB-2024-001'}
                          </p>
                          <div className="space-x-2">
                            <Button variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              在线预览
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setGenerationStep(1)}>
                        重新生成
                      </Button>
                      <div className="flex space-x-4">
                        <Button variant="outline">
                          <Save className="h-4 w-4 mr-2" />
                          保存草稿
                        </Button>
                        <Button className="btn-primary">
                          <Download className="h-4 w-4 mr-2" />
                          下载文书
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* 生成历史标签页 */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <span>生成历史</span>
              </CardTitle>
              <CardDescription>
                查看您之前生成的文书记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无生成记录</h3>
                <p className="text-gray-600 mb-4">您还没有生成过任何文书</p>
                <Button onClick={() => setActiveTab('templates')} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  开始生成文书
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
