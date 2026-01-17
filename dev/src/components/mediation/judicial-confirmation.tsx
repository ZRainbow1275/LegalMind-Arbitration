// dev/src/components/mediation/judicial-confirmation.tsx
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Scale,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Eye,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  Building
} from 'lucide-react';

interface JudicialConfirmationProps {
  mediationId: string;
  agreementId: string;
  agreementSigned: boolean;
  onConfirmationSubmitted?: (confirmationId: string) => void;
  className?: string;
}

interface ConfirmationApplication {
  id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt?: Date;
  reviewedAt?: Date;
  courtName: string;
  caseNumber?: string;
  judgeAssigned?: string;
  estimatedDays: number;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    uploaded: boolean;
  }>;
}

const mockCourts = [
  { id: 'court-1', name: '北京市朝阳区人民法院', jurisdiction: '朝阳区', level: '基层法院' },
  { id: 'court-2', name: '北京市海淀区人民法院', jurisdiction: '海淀区', level: '基层法院' },
  { id: 'court-3', name: '北京市西城区人民法院', jurisdiction: '西城区', level: '基层法院' },
  { id: 'court-4', name: '北京市第一中级人民法院', jurisdiction: '北京市', level: '中级法院' }
];

export function JudicialConfirmation({ 
  mediationId, 
  agreementId, 
  agreementSigned,
  onConfirmationSubmitted,
  className 
}: JudicialConfirmationProps) {
  const [application, setApplication] = useState<ConfirmationApplication>({
    id: '',
    status: 'draft',
    courtName: '',
    estimatedDays: 15,
    documents: [
      { id: 'doc-1', name: '调解协议书', type: 'agreement', required: true, uploaded: false },
      { id: 'doc-2', name: '当事人身份证明', type: 'identity', required: true, uploaded: false },
      { id: 'doc-3', name: '调解申请书', type: 'application', required: true, uploaded: false },
      { id: 'doc-4', name: '争议材料', type: 'evidence', required: false, uploaded: false },
      { id: 'doc-5', name: '授权委托书', type: 'authorization', required: false, uploaded: false }
    ]
  });

  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    courtId: '',
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    respondentName: '',
    respondentPhone: '',
    respondentEmail: '',
    disputeAmount: '',
    disputeDescription: '',
    urgencyReason: '',
    preferredHearingDate: '',
    additionalNotes: ''
  });

  const [confirmationChecks, setConfirmationChecks] = useState({
    agreementComplete: false,
    partiesConsent: false,
    legalCompliance: false,
    documentComplete: false
  });

  const requiredDocuments = application.documents.filter(doc => doc.required);
  const uploadedRequired = requiredDocuments.filter(doc => doc.uploaded).length;
  const documentProgress = (uploadedRequired / requiredDocuments.length) * 100;

  const allChecksComplete = Object.values(confirmationChecks).every(check => check);
  const canSubmit = agreementSigned && allChecksComplete && documentProgress === 100;

  const handleSubmitApplication = () => {
    if (!canSubmit) return;

    const confirmationId = `conf-${Date.now()}`;
    
    setApplication(prev => ({
      ...prev,
      id: confirmationId,
      status: 'submitted',
      submittedAt: new Date(),
      courtName: mockCourts.find(court => court.id === applicationForm.courtId)?.name || '',
      caseNumber: `(2024)京${applicationForm.courtId.slice(-1)}民特${Math.floor(Math.random() * 1000)}号`
    }));

    setShowApplicationDialog(false);
    onConfirmationSubmitted?.(confirmationId);
  };

  const handleDocumentUpload = (docId: string) => {
    setApplication(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === docId ? { ...doc, uploaded: true } : doc
      )
    }));
  };

  const getStatusColor = (status: ConfirmationApplication['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: ConfirmationApplication['status']) => {
    const labels = {
      draft: '草稿',
      submitted: '已提交',
      under_review: '审核中',
      approved: '已确认',
      rejected: '已驳回'
    };
    return labels[status];
  };

  const getStatusIcon = (status: ConfirmationApplication['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'under_review':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'submitted':
        return <Send className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 司法确认状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              司法确认
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(application.status)}
              <Badge className={getStatusColor(application.status)}>
                {getStatusLabel(application.status)}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!agreementSigned ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">调解协议尚未签署</h3>
              <p className="text-gray-600">
                请先完成调解协议的签署，然后才能申请司法确认
              </p>
            </div>
          ) : application.status === 'draft' ? (
            <div className="space-y-6">
              <div className="text-center py-4">
                <Scale className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">申请司法确认</h3>
                <p className="text-gray-600 mb-4">
                  调解协议已签署，您可以申请人民法院司法确认，使协议具有强制执行力
                </p>
                <Dialog open={showApplicationDialog} onOpenChange={setShowApplicationDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4 mr-2" />
                      开始申请
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>司法确认申请</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* 选择法院 */}
                      <div className="space-y-4">
                        <h4 className="font-medium">选择管辖法院</h4>
                        <Select
                          value={applicationForm.courtId}
                          onValueChange={(value) =>
                            setApplicationForm(prev => ({ ...prev, courtId: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="请选择有管辖权的人民法院" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockCourts.map((court) => (
                              <SelectItem key={court.id} value={court.id}>
                                <div>
                                  <div className="font-medium">{court.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {court.level} · {court.jurisdiction}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 当事人信息 */}
                      <div className="space-y-4">
                        <h4 className="font-medium">当事人信息</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-700">申请人</h5>
                            <div>
                              <Label htmlFor="applicant-name">姓名/名称</Label>
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
                            <div>
                              <Label htmlFor="applicant-email">电子邮箱</Label>
                              <Input
                                id="applicant-email"
                                type="email"
                                value={applicationForm.applicantEmail}
                                onChange={(e) =>
                                  setApplicationForm(prev => ({ ...prev, applicantEmail: e.target.value }))
                                }
                                placeholder="电子邮箱"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-700">被申请人</h5>
                            <div>
                              <Label htmlFor="respondent-name">姓名/名称</Label>
                              <Input
                                id="respondent-name"
                                value={applicationForm.respondentName}
                                onChange={(e) =>
                                  setApplicationForm(prev => ({ ...prev, respondentName: e.target.value }))
                                }
                                placeholder="被申请人姓名或企业名称"
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
                            <div>
                              <Label htmlFor="respondent-email">电子邮箱</Label>
                              <Input
                                id="respondent-email"
                                type="email"
                                value={applicationForm.respondentEmail}
                                onChange={(e) =>
                                  setApplicationForm(prev => ({ ...prev, respondentEmail: e.target.value }))
                                }
                                placeholder="电子邮箱"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 争议信息 */}
                      <div className="space-y-4">
                        <h4 className="font-medium">争议信息</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dispute-amount">争议金额（元）</Label>
                            <Input
                              id="dispute-amount"
                              type="number"
                              value={applicationForm.disputeAmount}
                              onChange={(e) =>
                                setApplicationForm(prev => ({ ...prev, disputeAmount: e.target.value }))
                              }
                              placeholder="争议涉及的金额"
                            />
                          </div>
                          <div>
                            <Label htmlFor="preferred-date">希望开庭日期</Label>
                            <Input
                              id="preferred-date"
                              type="date"
                              value={applicationForm.preferredHearingDate}
                              onChange={(e) =>
                                setApplicationForm(prev => ({ ...prev, preferredHearingDate: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="dispute-description">争议简述</Label>
                          <Textarea
                            id="dispute-description"
                            value={applicationForm.disputeDescription}
                            onChange={(e) =>
                              setApplicationForm(prev => ({ ...prev, disputeDescription: e.target.value }))
                            }
                            placeholder="简要描述争议的基本情况..."
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* 确认事项 */}
                      <div className="space-y-4">
                        <h4 className="font-medium">确认事项</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="agreement-complete"
                              checked={confirmationChecks.agreementComplete}
                              onCheckedChange={(checked) =>
                                setConfirmationChecks(prev => ({ ...prev, agreementComplete: checked as boolean }))
                              }
                            />
                            <Label htmlFor="agreement-complete" className="text-sm">
                              调解协议内容完整，条款明确具体
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="parties-consent"
                              checked={confirmationChecks.partiesConsent}
                              onCheckedChange={(checked) =>
                                setConfirmationChecks(prev => ({ ...prev, partiesConsent: checked as boolean }))
                              }
                            />
                            <Label htmlFor="parties-consent" className="text-sm">
                              各方当事人均同意协议内容，签署真实有效
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="legal-compliance"
                              checked={confirmationChecks.legalCompliance}
                              onCheckedChange={(checked) =>
                                setConfirmationChecks(prev => ({ ...prev, legalCompliance: checked as boolean }))
                              }
                            />
                            <Label htmlFor="legal-compliance" className="text-sm">
                              协议内容不违反法律法规，不损害国家、集体或第三人利益
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="document-complete"
                              checked={confirmationChecks.documentComplete}
                              onCheckedChange={(checked) =>
                                setConfirmationChecks(prev => ({ ...prev, documentComplete: checked as boolean }))
                              }
                            />
                            <Label htmlFor="document-complete" className="text-sm">
                              已准备齐全所需申请材料
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowApplicationDialog(false)}>
                          取消
                        </Button>
                        <Button
                          onClick={handleSubmitApplication}
                          disabled={!canSubmit}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          提交申请
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* 文档准备进度 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">申请材料准备</h4>
                  <span className="text-sm text-gray-500">
                    {uploadedRequired}/{requiredDocuments.length} 必需文档已准备
                  </span>
                </div>
                <Progress value={documentProgress} className="h-2" />
                <div className="space-y-2">
                  {application.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">{doc.name}</div>
                          <div className="text-xs text-gray-500">
                            {doc.required ? '必需文档' : '可选文档'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.uploaded ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已准备
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDocumentUpload(doc.id)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            准备
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Building className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-sm font-medium text-gray-900">{application.courtName}</div>
                  <div className="text-xs text-gray-500">受理法院</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <div className="text-sm font-medium text-gray-900">{application.caseNumber}</div>
                  <div className="text-xs text-gray-500">案件编号</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-sm font-medium text-gray-900">{application.estimatedDays}个工作日</div>
                  <div className="text-xs text-gray-500">预计审理时间</div>
                </div>
              </div>

              {application.submittedAt && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">申请已提交</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    提交时间：{application.submittedAt.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    法院将在{application.estimatedDays}个工作日内完成审查并作出确认决定
                  </div>
                </div>
              )}

              {application.status === 'approved' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">司法确认成功</span>
                  </div>
                  <div className="text-sm text-green-700">
                    调解协议已获得人民法院司法确认，具有强制执行力
                  </div>
                  <div className="mt-3">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Download className="h-4 w-4 mr-2" />
                      下载确认书
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
