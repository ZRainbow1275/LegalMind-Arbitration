// dev/src/components/mediation/enforcement-application.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Gavel,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  Building,
  Search,
  Download,
  Eye,
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react';

interface EnforcementApplicationProps {
  mediationId: string;
  confirmationId?: string;
  judicialConfirmed: boolean;
  onApplicationSubmitted?: (applicationId: string) => void;
  className?: string;
}

interface EnforcementCase {
  id: string;
  caseNumber: string;
  status: 'pending' | 'accepted' | 'investigating' | 'executing' | 'completed' | 'suspended' | 'terminated';
  submittedAt: Date;
  acceptedAt?: Date;
  executorAssigned?: string;
  targetAmount: number;
  executedAmount: number;
  estimatedDays: number;
  currentStep: string;
  nextAction: string;
  nextActionDate?: Date;
  executionMethods: string[];
  updates: Array<{
    id: string;
    date: Date;
    action: string;
    description: string;
    result?: string;
  }>;
}

const mockEnforcementCase: EnforcementCase = {
  id: 'enf-001',
  caseNumber: '(2024)京0105执1234号',
  status: 'executing',
  submittedAt: new Date('2024-01-20'),
  acceptedAt: new Date('2024-01-22'),
  executorAssigned: '执行员李某',
  targetAmount: 500000,
  executedAmount: 200000,
  estimatedDays: 180,
  currentStep: '财产调查',
  nextAction: '银行账户查询',
  nextActionDate: new Date('2024-02-15'),
  executionMethods: ['银行存款查询', '房产查封', '工资扣划'],
  updates: [
    {
      id: 'update-1',
      date: new Date('2024-01-22'),
      action: '立案受理',
      description: '执行申请已受理，分配执行员',
      result: '已分配执行员李某'
    },
    {
      id: 'update-2',
      date: new Date('2024-01-25'),
      action: '财产调查',
      description: '开始调查被执行人财产状况',
      result: '发现银行账户3个'
    },
    {
      id: 'update-3',
      date: new Date('2024-02-01'),
      action: '银行查询',
      description: '查询被执行人银行账户余额',
      result: '冻结账户余额15万元'
    },
    {
      id: 'update-4',
      date: new Date('2024-02-10'),
      action: '扣划执行',
      description: '执行银行存款扣划',
      result: '成功扣划20万元'
    }
  ]
};

export function EnforcementApplication({ 
  mediationId, 
  confirmationId, 
  judicialConfirmed,
  onApplicationSubmitted,
  className 
}: EnforcementApplicationProps) {
  const [enforcementCase, setEnforcementCase] = useState<EnforcementCase | null>(
    judicialConfirmed ? mockEnforcementCase : null
  );
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    applicantName: '',
    applicantPhone: '',
    applicantAddress: '',
    respondentName: '',
    respondentPhone: '',
    respondentAddress: '',
    respondentWorkplace: '',
    executionAmount: '',
    executionReason: '',
    knownAssets: '',
    urgencyReason: '',
    additionalInfo: ''
  });

  const executionProgress = enforcementCase 
    ? (enforcementCase.executedAmount / enforcementCase.targetAmount) * 100 
    : 0;

  const handleSubmitApplication = () => {
    const applicationId = `enf-${Date.now()}`;
    
    const newCase: EnforcementCase = {
      id: applicationId,
      caseNumber: `(2024)京0105执${Math.floor(Math.random() * 9999)}号`,
      status: 'pending',
      submittedAt: new Date(),
      targetAmount: parseFloat(applicationForm.executionAmount) || 0,
      executedAmount: 0,
      estimatedDays: 180,
      currentStep: '待受理',
      nextAction: '审查申请材料',
      executionMethods: [],
      updates: [
        {
          id: 'update-init',
          date: new Date(),
          action: '申请提交',
          description: '强制执行申请已提交',
          result: '等待法院受理'
        }
      ]
    };

    setEnforcementCase(newCase);
    setShowApplicationDialog(false);
    onApplicationSubmitted?.(applicationId);
  };

  const getStatusColor = (status: EnforcementCase['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      investigating: 'bg-purple-100 text-purple-800',
      executing: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      suspended: 'bg-gray-100 text-gray-800',
      terminated: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: EnforcementCase['status']) => {
    const labels = {
      pending: '待受理',
      accepted: '已受理',
      investigating: '调查中',
      executing: '执行中',
      completed: '执行完毕',
      suspended: '中止执行',
      terminated: '终结执行'
    };
    return labels[status];
  };

  const getStatusIcon = (status: EnforcementCase['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'terminated':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'executing':
        return <Gavel className="h-5 w-5 text-orange-600" />;
      case 'investigating':
        return <Search className="h-5 w-5 text-purple-600" />;
      case 'accepted':
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 强制执行状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              强制执行
            </div>
            {enforcementCase && (
              <div className="flex items-center gap-2">
                {getStatusIcon(enforcementCase.status)}
                <Badge className={getStatusColor(enforcementCase.status)}>
                  {getStatusLabel(enforcementCase.status)}
                </Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!judicialConfirmed ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">需要司法确认</h3>
              <p className="text-gray-600">
                申请强制执行前，需要先获得人民法院的司法确认
              </p>
            </div>
          ) : !enforcementCase ? (
            <div className="text-center py-8">
              <Gavel className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">申请强制执行</h3>
              <p className="text-gray-600 mb-4">
                调解协议已获司法确认，如对方不履行协议，您可以申请强制执行
              </p>
              <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Send className="h-4 w-4 mr-2" />
                    申请强制执行
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>强制执行申请</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* 申请人信息 */}
                    <div className="space-y-4">
                      <h4 className="font-medium">申请人信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="applicant-name">申请人姓名/名称</Label>
                          <Input
                            id="applicant-name"
                            value={applicationForm.applicantName}
                            onChange={(e) =>
                              setApplicationForm(prev => ({ ...prev, applicantName: e.target.value }))
                            }
                            placeholder="申请人姓名或企业名称"
                          />
                        </div>
                        <div>
                          <Label htmlFor="applicant-phone">联系电话</Label>
                          <Input
                            id="applicant-phone"
                            value={applicationForm.applicantPhone}
                            onChange={(e) =>
                              setApplicationForm(prev => ({ ...prev, applicantPhone: e.target.value }))
                            }
                            placeholder="联系电话"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="applicant-address">联系地址</Label>
                        <Input
                          id="applicant-address"
                          value={applicationForm.applicantAddress}
                          onChange={(e) =>
                            setApplicationForm(prev => ({ ...prev, applicantAddress: e.target.value }))
                          }
                          placeholder="详细联系地址"
                        />
                      </div>
                    </div>

                    {/* 被执行人信息 */}
                    <div className="space-y-4">
                      <h4 className="font-medium">被执行人信息</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="respondent-name">被执行人姓名/名称</Label>
                          <Input
                            id="respondent-name"
                            value={applicationForm.respondentName}
                            onChange={(e) =>
                              setApplicationForm(prev => ({ ...prev, respondentName: e.target.value }))
                            }
                            placeholder="被执行人姓名或企业名称"
                          />
                        </div>
                        <div>
                          <Label htmlFor="respondent-phone">联系电话</Label>
                          <Input
                            id="respondent-phone"
                            value={applicationForm.respondentPhone}
                            onChange={(e) =>
                              setApplicationForm(prev => ({ ...prev, respondentPhone: e.target.value }))
                            }
                            placeholder="联系电话"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="respondent-address">住所地址</Label>
                        <Input
                          id="respondent-address"
                          value={applicationForm.respondentAddress}
                          onChange={(e) =>
                            setApplicationForm(prev => ({ ...prev, respondentAddress: e.target.value }))
                          }
                          placeholder="被执行人住所地址"
                        />
                      </div>
                      <div>
                        <Label htmlFor="respondent-workplace">工作单位</Label>
                        <Input
                          id="respondent-workplace"
                          value={applicationForm.respondentWorkplace}
                          onChange={(e) =>
                            setApplicationForm(prev => ({ ...prev, respondentWorkplace: e.target.value }))
                          }
                          placeholder="被执行人工作单位（如知道）"
                        />
                      </div>
                    </div>

                    {/* 执行请求 */}
                    <div className="space-y-4">
                      <h4 className="font-medium">执行请求</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="execution-amount">执行金额（元）</Label>
                          <Input
                            id="execution-amount"
                            type="number"
                            value={applicationForm.executionAmount}
                            onChange={(e) =>
                              setApplicationForm(prev => ({ ...prev, executionAmount: e.target.value }))
                            }
                            placeholder="申请执行的金额"
                          />
                        </div>
                        <div>
                          <Label htmlFor="execution-reason">执行依据</Label>
                          <Select
                            value={applicationForm.executionReason}
                            onValueChange={(value) =>
                              setApplicationForm(prev => ({ ...prev, executionReason: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择执行依据" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mediation-agreement">调解协议</SelectItem>
                              <SelectItem value="court-judgment">法院判决</SelectItem>
                              <SelectItem value="arbitration-award">仲裁裁决</SelectItem>
                              <SelectItem value="notarial-deed">公证债权文书</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="known-assets">已知财产线索</Label>
                        <Textarea
                          id="known-assets"
                          value={applicationForm.knownAssets}
                          onChange={(e) =>
                            setApplicationForm(prev => ({ ...prev, knownAssets: e.target.value }))
                          }
                          placeholder="请提供被执行人的财产线索，如银行账户、房产、车辆等..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="urgency-reason">紧急执行理由（可选）</Label>
                        <Textarea
                          id="urgency-reason"
                          value={applicationForm.urgencyReason}
                          onChange={(e) =>
                            setApplicationForm(prev => ({ ...prev, urgencyReason: e.target.value }))
                          }
                          placeholder="如需紧急执行，请说明理由..."
                          rows={2}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>
                        取消
                      </Button>
                      <Button
                        onClick={handleSubmitApplication}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        提交申请
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 执行概况 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-sm font-medium text-gray-900">{enforcementCase.caseNumber}</div>
                  <div className="text-xs text-gray-500">执行案号</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-sm font-medium text-gray-900">
                    ¥{enforcementCase.executedAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">已执行金额</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-sm font-medium text-gray-900">
                    ¥{enforcementCase.targetAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">执行标的</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-sm font-medium text-gray-900">{enforcementCase.estimatedDays}天</div>
                  <div className="text-xs text-gray-500">预计执行期限</div>
                </div>
              </div>

              {/* 执行进度 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    执行进度
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>执行进度</span>
                        <span>{Math.round(executionProgress)}%</span>
                      </div>
                      <Progress value={executionProgress} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">当前步骤</div>
                        <div className="font-medium">{enforcementCase.currentStep}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">下一步行动</div>
                        <div className="font-medium">{enforcementCase.nextAction}</div>
                      </div>
                    </div>

                    {enforcementCase.executorAssigned && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">执行员：{enforcementCase.executorAssigned}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 执行记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      执行记录
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      刷新状态
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {enforcementCase.updates.map((update, index) => (
                      <div key={update.id} className="flex gap-4">
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{update.action}</h4>
                            <span className="text-xs text-gray-500">
                              {update.date.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{update.description}</p>
                          {update.result && (
                            <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                              结果：{update.result}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
