// src/app/(private)/cases/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDraftsStore, type CaseDraft } from '@/store/drafts';
import {
  FileText,
  Upload,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Save,
  Send,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function NewCasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');

  const { saveDraftFromForm, getDraft, updateDraft, calculateProgress } = useDraftsStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [caseType, setCaseType] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  type CaseFormData = CaseDraft['formData'];

  // 表单数据状态
  const [formData, setFormData] = useState<CaseFormData>({
    basicInfo: {
      caseType: '',
      disputeAmount: '',
      description: '',
      urgency: 'normal'
    },
    parties: {
      applicant: {
        name: '',
        type: 'individual' as 'individual' | 'company',
        idNumber: '',
        phone: '',
        email: '',
        address: '',
        legalRep: ''
      },
      respondent: {
        name: '',
        type: 'individual' as 'individual' | 'company',
        idNumber: '',
        phone: '',
        email: '',
        address: '',
        legalRep: ''
      }
    },
    dispute: {
      background: '',
      claims: '',
      evidence: '',
      legalBasis: ''
    },
    attachments: [] as Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      url?: string;
    }>
  });

  // 加载草稿数据
  useEffect(() => {
    if (draftId) {
      const draft = getDraft(draftId);
      if (draft) {
        // 确保legalRep字段不为undefined
        const draftData = {
          ...draft.formData,
          parties: {
            ...draft.formData.parties,
            applicant: {
              ...draft.formData.parties.applicant,
              legalRep: draft.formData.parties.applicant.legalRep || ''
            },
            respondent: {
              ...draft.formData.parties.respondent,
              legalRep: draft.formData.parties.respondent.legalRep || ''
            }
          }
        };
        setFormData(draftData);
        setCaseType(draft.formData.basicInfo.caseType);
        setUploadedFiles(draft.formData.attachments.map(a => a.name));
      }
    }
  }, [draftId, getDraft]);

  const steps = [
    { id: 1, name: '基本信息', description: '填写案件基本信息' },
    { id: 2, name: '争议详情', description: '描述争议内容和请求' },
    { id: 3, name: '证据材料', description: '上传相关证据文件' },
    { id: 4, name: '确认提交', description: '确认信息并提交申请' }
  ];

  const caseTypes = [
    { value: 'contract', label: '合同纠纷', description: '因合同履行产生的争议' },
    { value: 'investment', label: '投资争议', description: '投资相关的争议纠纷' },
    { value: 'labor', label: '劳动争议', description: '劳动关系相关争议' },
    { value: 'intellectual', label: '知识产权', description: '专利、商标等知识产权争议' },
    { value: 'construction', label: '建设工程', description: '建设工程合同争议' },
    { value: 'other', label: '其他', description: '其他类型的商事争议' }
  ];

  const handleFileUpload = (fileName: string) => {
    setUploadedFiles([...uploadedFiles, fileName]);
    // 同时更新表单数据中的附件
    const newAttachment = {
      id: Date.now().toString(),
      name: fileName,
      type: fileName.split('.').pop() || '',
      size: Math.floor(Math.random() * 1000000), // 模拟文件大小
    };
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment]
    }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (draftId) {
        // 更新现有草稿
        const progress = calculateProgress(formData);
        updateDraft(draftId, {
          formData,
          progress,
          status: progress >= 90 ? '待提交' : '待完善'
        });
        setSaveMessage('草稿已更新');
      } else {
        // 创建新草稿
        const newDraftId = saveDraftFromForm(formData);
        setSaveMessage('草稿已保存');
        // 更新URL以包含草稿ID
        router.replace(`/cases/new?draftId=${newDraftId}`);
      }
    } catch (error) {
      setSaveMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
      // 3秒后清除消息
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  type UpdatableSection = Exclude<keyof CaseFormData, 'attachments'>;

  const updateFormData = <S extends UpdatableSection, F extends keyof CaseFormData[S]>(
    section: S,
    field: F,
    value: CaseFormData[S][F]
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  type PartySection = CaseFormData['parties'];
  type PartyKey = keyof PartySection;

  const updateNestedFormData = <S extends PartyKey, F extends keyof PartySection[S]>(
    section: 'parties',
    subsection: S,
    field: F,
    value: PartySection[S][F]
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/cases">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回案件列表
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">新建仲裁</h1>
            <p className="text-gray-600 mt-1">请按步骤填写仲裁申请信息</p>
          </div>
        </div>
      </div>

      {/* 进度指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-orange-500 border-orange-500 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-orange-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 表单内容 */}
      <Card>
        <CardHeader>
          <CardTitle>步骤 {currentStep}: {steps[currentStep - 1].name}</CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="applicant-name">申请人姓名/企业名称</Label>
                  <Input id="applicant-name" placeholder="请输入申请人姓名或企业名称" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicant-type">申请人类型</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择申请人类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">个人</SelectItem>
                      <SelectItem value="company">企业</SelectItem>
                      <SelectItem value="organization">其他组织</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="case-type">争议类型</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        caseType === type.value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCaseType(type.value)}
                    >
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="respondent-name">被申请人姓名/企业名称</Label>
                  <Input id="respondent-name" placeholder="请输入被申请人姓名或企业名称" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dispute-amount">争议金额（元）</Label>
                  <Input id="dispute-amount" type="number" placeholder="请输入争议金额" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dispute-facts">争议事实</Label>
                <Textarea 
                  id="dispute-facts" 
                  placeholder="请详细描述争议的事实经过..."
                  className="min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arbitration-request">仲裁请求</Label>
                <Textarea 
                  id="arbitration-request" 
                  placeholder="请明确列出您的仲裁请求..."
                  className="min-h-32"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-basis">法律依据</Label>
                <Textarea 
                  id="legal-basis" 
                  placeholder="请列出支持您请求的法律依据..."
                  className="min-h-24"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">上传证据材料</h3>
                <p className="text-gray-600 mb-4">支持 PDF、DOC、DOCX、JPG、PNG 格式，单个文件不超过 10MB</p>
                <Button onClick={() => handleFileUpload('示例文件.pdf')}>
                  <Plus className="h-4 w-4 mr-2" />
                  选择文件
                </Button>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>已上传文件</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <span className="text-sm text-gray-900">{file}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">提交前请确认</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      请仔细检查所填写的信息，提交后部分信息将无法修改。
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">申请信息摘要</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">争议类型</h4>
                    <p className="text-gray-600">{caseTypes.find(t => t.value === caseType)?.label || '未选择'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">上传文件</h4>
                    <p className="text-gray-600">{uploadedFiles.length} 个文件</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 保存状态提示 */}
          {saveMessage && (
            <Alert className={saveMessage.includes('失败') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertDescription className={saveMessage.includes('失败') ? 'text-red-700' : 'text-green-700'}>
                {saveMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              上一步
            </Button>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存草稿
                  </>
                )}
              </Button>

              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  下一步
                </Button>
              ) : (
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  提交申请
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
