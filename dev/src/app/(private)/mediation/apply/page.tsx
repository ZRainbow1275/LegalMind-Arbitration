// src/app/(private)/mediation/apply/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Plus,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  X,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Scale,
  Users
} from 'lucide-react';

// 模拟案件数据
const mockCases = [
  {
    id: 'case-001',
    title: '合同纠纷案',
    parties: ['张三', '李四'],
    status: '审理中',
    amount: '50万元'
  },
  {
    id: 'case-002', 
    title: '投资争议案',
    parties: ['王五', '赵六'],
    status: '证据交换',
    amount: '100万元'
  }
];

export default function MediationApplyPage() {
  const router = useRouter();
  const [selectedCase, setSelectedCase] = useState('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    // 基本信息
    applicant: '',
    applicantType: 'individual', // individual | company
    applicantContact: {
      phone: '',
      email: '',
      address: ''
    },
    respondent: '',
    respondentType: 'individual',
    respondentContact: {
      phone: '',
      email: '',
      address: ''
    },

      // 争议信息
      disputeType: '',
      disputeAmount: '',
      disputeDescription: '',
      urgency: 'normal',
      mediationReason: '',
      expectedOutcome: '',

    // 调解偏好
    preferredMediator: '',
    preferredDate: '',
    preferredTime: '',
    preferredLocation: 'online', // online | offline | hybrid

    // 附件
    attachments: [] as File[]
  });

  // 文件上传处理
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  // 删除附件
  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // 表单验证
  const validateForm = () => {
    const required = [
      'applicant',
      'respondent',
      'disputeType',
      'disputeDescription',
      'mediationReason'
    ];

    return required.every(field => {
      const value = formData[field as keyof typeof formData];
      return typeof value === 'string' && value.trim() !== '';
    });
  };

  // 提交申请
  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('请填写所有必填项');
      return;
    }

    setIsSubmitting(true);

    try {
      // 模拟提交
      await new Promise(resolve => setTimeout(resolve, 2000));

      setShowSuccess(true);

      // 3秒后跳转
      setTimeout(() => {
        router.push('/mediation');
      }, 3000);

    } catch (error) {
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="container mx-auto p-8 space-y-8 animate-fade-in">
      {/* 页面头部 */}
      <div className="animate-slide-up">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">调解申请</h1>
        <p className="text-lg text-gray-600">申请专业调解服务，快速解决争议</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 申请表单 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="animate-slide-up" style={{animationDelay: '0.1s'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                调解申请表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
                {/* 案件信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    案件信息
                  </h3>
                  <div>
                    <Label htmlFor="case">关联案件（可选）</Label>
                    <Select value={selectedCase} onValueChange={setSelectedCase}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要申请调解的案件" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不关联现有案件</SelectItem>
                        {mockCases.map(case_ => (
                          <SelectItem key={case_.id} value={case_.id}>
                            {case_.title} - {case_.amount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 当事人信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    当事人信息
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 申请人信息 */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-primary-600">申请人信息</h4>
                      <div>
                        <Label htmlFor="applicant">申请人姓名/名称 *</Label>
                        <Input
                          id="applicant"
                          value={formData.applicant}
                          onChange={(e) => setFormData(prev => ({ ...prev, applicant: e.target.value }))}
                          placeholder="请输入申请人姓名或公司名称"
                          required
                        />
                      </div>

                      <div>
                        <Label>申请人类型</Label>
                        <Select
                          value={formData.applicantType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, applicantType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">个人</SelectItem>
                            <SelectItem value="company">企业</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 被申请人信息 */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-primary-600">被申请人信息</h4>
                      <div>
                        <Label htmlFor="respondent">被申请人姓名/名称 *</Label>
                        <Input
                          id="respondent"
                          value={formData.respondent}
                          onChange={(e) => setFormData(prev => ({ ...prev, respondent: e.target.value }))}
                          placeholder="请输入被申请人姓名或公司名称"
                          required
                        />
                      </div>

                      <div>
                        <Label>被申请人类型</Label>
                        <Select
                          value={formData.respondentType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, respondentType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">个人</SelectItem>
                            <SelectItem value="company">企业</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 争议信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    争议信息
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="disputeType">争议类型 *</Label>
                      <Select
                        value={formData.disputeType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, disputeType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择争议类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">合同纠纷</SelectItem>
                          <SelectItem value="investment">投资争议</SelectItem>
                          <SelectItem value="labor">劳动争议</SelectItem>
                          <SelectItem value="property">财产纠纷</SelectItem>
                          <SelectItem value="intellectual">知识产权</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="disputeAmount">争议金额</Label>
                      <Input
                        id="disputeAmount"
                        value={formData.disputeAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, disputeAmount: e.target.value }))}
                        placeholder="请输入争议金额（如：50万元）"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="disputeDescription">争议描述 *</Label>
                    <Textarea
                      id="disputeDescription"
                      value={formData.disputeDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, disputeDescription: e.target.value }))}
                      placeholder="请详细描述争议的具体情况、争议焦点等..."
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="mediationReason">申请调解原因 *</Label>
                    <Textarea
                      id="mediationReason"
                      value={formData.mediationReason}
                      onChange={(e) => setFormData(prev => ({ ...prev, mediationReason: e.target.value }))}
                      placeholder="请说明为什么选择调解方式解决争议..."
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="expectedOutcome">期望结果</Label>
                    <Textarea
                      id="expectedOutcome"
                      value={formData.expectedOutcome}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedOutcome: e.target.value }))}
                      placeholder="请描述您希望通过调解达到的结果..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* 调解偏好 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    调解偏好
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>调解方式</Label>
                      <Select
                        value={formData.preferredLocation}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, preferredLocation: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">在线调解</SelectItem>
                          <SelectItem value="offline">线下调解</SelectItem>
                          <SelectItem value="hybrid">混合调解</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>期望日期</Label>
                      <Input
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, preferredDate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>期望时间</Label>
                      <Select
                        value={formData.preferredTime}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, preferredTime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择时间段" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">上午 (9:00-12:00)</SelectItem>
                          <SelectItem value="afternoon">下午 (14:00-17:00)</SelectItem>
                          <SelectItem value="evening">晚上 (19:00-21:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>调解员偏好</Label>
                    <Input
                      value={formData.preferredMediator}
                      onChange={(e) => setFormData(prev => ({ ...prev, preferredMediator: e.target.value }))}
                      placeholder="如有特定调解员偏好，请填写姓名（可选）"
                    />
                  </div>
                </div>

                {/* 附件上传 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    相关材料
                  </h3>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        上传相关证据材料、合同文件等
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button type="button" variant="outline" className="cursor-pointer">
                          选择文件
                        </Button>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        支持 PDF、Word、图片格式，单个文件不超过10MB
                      </p>
                    </div>
                  </div>

                  {/* 已上传文件列表 */}
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">已上传文件：</p>
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 争议信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="disputeType">争议类型</Label>
                    <Select value={formData.disputeType} onValueChange={(value) => setFormData({...formData, disputeType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择争议类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contract">合同纠纷</SelectItem>
                        <SelectItem value="investment">投资争议</SelectItem>
                        <SelectItem value="labor">劳动争议</SelectItem>
                        <SelectItem value="property">房地产纠纷</SelectItem>
                        <SelectItem value="intellectual">知识产权</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                        <Label htmlFor="amount">争议金额</Label>
                        <Input
                          id="amount"
                          value={formData.disputeAmount}
                          onChange={(e) => setFormData({ ...formData, disputeAmount: e.target.value })}
                          placeholder="例：100万元"
                        />
                      </div>
                    </div>

                {/* 争议描述 */}
                <div>
                      <Label htmlFor="description">争议描述</Label>
                      <Textarea
                        id="description"
                        value={formData.disputeDescription}
                        onChange={(e) => setFormData({ ...formData, disputeDescription: e.target.value })}
                        placeholder="请详细描述争议的起因、经过和争议焦点..."
                        rows={4}
                        required
                      />
                    </div>

                {/* 紧急程度 */}
                <div>
                    <Label htmlFor="urgency">紧急程度</Label>
                    <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">一般（7个工作日内）</SelectItem>
                      <SelectItem value="normal">普通（3个工作日内）</SelectItem>
                      <SelectItem value="high">紧急（24小时内）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 成功提示 */}
                {showSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      调解申请已成功提交！我们将在24小时内安排调解员联系您。正在跳转到调解管理页面...
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={isSubmitting || showSuccess}
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      提交中...
                    </>
                  ) : showSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      提交成功
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      提交调解申请
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏信息 */}
        <div className="space-y-6">
          {/* 调解流程 */}
          <Card className="animate-slide-up" style={{animationDelay: '0.2s'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                调解流程
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <div className="font-medium">提交申请</div>
                  <div className="text-sm text-muted-foreground">填写调解申请表</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <div className="font-medium">安排调解员</div>
                  <div className="text-sm text-muted-foreground">24小时内分配专业调解员</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <div className="font-medium">协商调解</div>
                  <div className="text-sm text-muted-foreground">多方协商达成一致</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <div className="font-medium">签署协议</div>
                  <div className="text-sm text-muted-foreground">达成调解协议</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 调解优势 */}
          <Card className="animate-slide-up" style={{animationDelay: '0.3s'}}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                调解优势
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">快速高效，节省时间成本</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">保密性强，维护商业关系</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">费用较低，经济实惠</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">灵活性高，双方自主决定</span>
              </div>
            </CardContent>
          </Card>

          {/* 联系方式 */}
          <Card className="animate-slide-up" style={{animationDelay: '0.4s'}}>
            <CardHeader>
              <CardTitle>需要帮助？</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>调解服务热线：400-123-4567</div>
                <div>工作时间：周一至周五 9:00-18:00</div>
                <div>邮箱：mediation@legalmind.com</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
