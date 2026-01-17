// src/components/cases/operation-modals.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DollarSign,
  Calculator,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Download,
  Send,
  Info,
  Users,
  MessageSquare,
  X,
  Edit,
  UserX,
  Upload,
  Calendar
} from 'lucide-react';
import { useNotificationHelpers } from '@/components/ui/notification';

// 仲裁费计算器模态框
interface ArbitrationFeeCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

export function ArbitrationFeeCalculator({ isOpen, onClose, caseId }: ArbitrationFeeCalculatorProps) {
  const [disputeAmount, setDisputeAmount] = useState('');
  const [caseType, setCaseType] = useState('');
  const [calculatedFee, setCalculatedFee] = useState<number | null>(null);
  const notify = useNotificationHelpers();

  const calculateFee = () => {
    const amount = parseFloat(disputeAmount);
    if (!amount || amount <= 0) return;

    // 简化的仲裁费计算逻辑
    let fee = 0;
    if (amount <= 100000) {
      fee = Math.max(3000, amount * 0.03);
    } else if (amount <= 500000) {
      fee = 3000 + (amount - 100000) * 0.025;
    } else if (amount <= 1000000) {
      fee = 13000 + (amount - 500000) * 0.02;
    } else {
      fee = 23000 + (amount - 1000000) * 0.015;
    }

    setCalculatedFee(Math.round(fee));
  };

  const handleSubmit = () => {
    // 这里会生成缴费通知书并发起缴费流程
    notify.success('仲裁费计算完成', '缴费通知书已生成！');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-orange-500" />
            <span>仲裁费计算器</span>
          </DialogTitle>
          <DialogDescription>
            根据争议金额和案件类型计算仲裁费用
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-amount">争议金额（元）</Label>
              <Input
                id="dispute-amount"
                type="number"
                placeholder="请输入争议金额"
                value={disputeAmount}
                onChange={(e) => setDisputeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="case-type">案件类型</Label>
              <Select value={caseType} onValueChange={setCaseType}>
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

          <Button onClick={calculateFee} className="w-full btn-primary">
            <Calculator className="h-4 w-4 mr-2" />
            计算仲裁费
          </Button>

          {calculatedFee && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg text-orange-800">计算结果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">争议金额：</span>
                    <span className="font-semibold">¥{parseFloat(disputeAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">仲裁费：</span>
                    <span className="text-xl font-bold text-orange-600">¥{calculatedFee.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="text-sm text-gray-600">
                    <Info className="h-4 w-4 inline mr-1" />
                    费用包含案件受理费、仲裁员费用等，具体以仲裁机构通知为准
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!calculatedFee}>
            <FileText className="h-4 w-4 mr-2" />
            生成缴费通知书
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 财产保全申请模态框
interface PropertyPreservationProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

export function PropertyPreservationModal({ isOpen, onClose, caseId }: PropertyPreservationProps) {
  const [preservationType, setPreservationType] = useState('');
  const [preservationAmount, setPreservationAmount] = useState('');
  const [preservationReason, setPreservationReason] = useState('');
  const [urgentReason, setUrgentReason] = useState('');
  const notify = useNotificationHelpers();

  const handleSubmit = () => {
    // 这里会生成财产保全申请书
    notify.success('财产保全申请已提交', '申请书已生成并提交！');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>财产保全申请</span>
          </DialogTitle>
          <DialogDescription>
            申请对被申请人的财产采取保全措施
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preservation-type">保全类型</Label>
              <Select value={preservationType} onValueChange={setPreservationType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择保全类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freeze">冻结银行存款</SelectItem>
                  <SelectItem value="seal">查封不动产</SelectItem>
                  <SelectItem value="detain">扣押动产</SelectItem>
                  <SelectItem value="other">其他保全措施</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preservation-amount">保全金额（元）</Label>
              <Input
                id="preservation-amount"
                type="number"
                placeholder="请输入保全金额"
                value={preservationAmount}
                onChange={(e) => setPreservationAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preservation-reason">保全理由</Label>
            <Textarea
              id="preservation-reason"
              placeholder="请详细说明申请财产保全的理由..."
              value={preservationReason}
              onChange={(e) => setPreservationReason(e.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgent-reason">紧急情况说明</Label>
            <Textarea
              id="urgent-reason"
              placeholder="请说明不立即采取保全措施可能造成的损害..."
              value={urgentReason}
              onChange={(e) => setUrgentReason(e.target.value)}
              className="min-h-24"
            />
          </div>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-sm text-yellow-800 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                重要提示
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700">
              <ul className="space-y-1 list-disc list-inside">
                <li>财产保全申请需要提供相应的担保</li>
                <li>保全金额不得超过争议标的额</li>
                <li>申请人应对保全申请的真实性负责</li>
                <li>如保全申请错误，申请人应承担赔偿责任</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} className="btn-primary">
            <Send className="h-4 w-4 mr-2" />
            提交保全申请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 文书生成模态框
interface DocumentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  documentType: string;
}

export function DocumentGeneratorModal({ isOpen, onClose, caseId, documentType }: DocumentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const notify = useNotificationHelpers();

  const getDocumentInfo = (type: string) => {
    const docs = {
      'payment-receipt': { title: '交费电子回单', description: '仲裁费缴费凭证' },
      'tribunal-notice': { title: '仲裁庭组成人员通知', description: '仲裁庭组成通知书' },
      'evidence-notice': { title: '应裁举证通知书', description: '举证责任通知书' },
      'application': { title: '仲裁申请书', description: '仲裁申请书正本' },
      'defense': { title: '答辩书', description: '被申请人答辩书' },
      'award': { title: '仲裁裁决书', description: '最终仲裁裁决' }
    };
    return docs[type as keyof typeof docs] || { title: '文书', description: '法律文书' };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    // 模拟文书生成过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    notify.success('文书生成成功！');
    onClose();
  };

  const docInfo = getDocumentInfo(documentType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-500" />
            <span>生成{docInfo.title}</span>
          </DialogTitle>
          <DialogDescription>
            {docInfo.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{docInfo.title}</h4>
                  <p className="text-sm text-gray-600">{docInfo.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isGenerating && (
            <div className="text-center py-4">
              <div className="loading-spinner w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">正在生成文书...</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            取消
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="btn-primary">
            {isGenerating ? (
              <>生成中...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                生成文书
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 通用操作模态框
interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  caseId: string;
}

export function OperationModal({ isOpen, onClose, type, caseId }: OperationModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const notify = useNotificationHelpers();

  const handleSubmit = () => {
    // 模拟提交操作
    notify.success(`${getModalTitle(type)}已提交`, `案件ID: ${caseId}`);
    onClose();
  };

  const getModalTitle = (type: string) => {
    switch (type) {
      case 'parties-info': return '当事人信息管理';
      case 'defense-document': return '答辩书管理';
      case 'mediation-application': return '调解申请';
      case 'case-withdrawal': return '撤案申请';
      case 'jurisdiction-objection': return '管辖异议';
      case 'change-arbitration-request': return '变更仲裁请求';
      case 'change-agent': return '变更代理人';
      default: return '操作';
    }
  };

  const renderModalContent = () => {
    switch (type) {
      case 'parties-info':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant-name">申请人姓名/名称</Label>
                <Input id="applicant-name" placeholder="请输入申请人姓名或企业名称" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicant-type">申请人类型</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">个人</SelectItem>
                    <SelectItem value="company">企业</SelectItem>
                    <SelectItem value="organization">组织</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicant-address">联系地址</Label>
              <Input id="applicant-address" placeholder="请输入详细地址" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant-phone">联系电话</Label>
                <Input id="applicant-phone" placeholder="请输入联系电话" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicant-email">电子邮箱</Label>
                <Input id="applicant-email" type="email" placeholder="请输入电子邮箱" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="respondent-name">被申请人姓名/名称</Label>
                <Input id="respondent-name" placeholder="请输入被申请人姓名或企业名称" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respondent-type">被申请人类型</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">个人</SelectItem>
                    <SelectItem value="company">企业</SelectItem>
                    <SelectItem value="organization">组织</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'defense-document':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defense-title">答辩书标题</Label>
              <Input id="defense-title" placeholder="请输入答辩书标题" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defense-content">答辩内容</Label>
              <Textarea
                id="defense-content"
                placeholder="请详细说明答辩理由和事实依据..."
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label>证据材料</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">点击上传或拖拽文件到此处</p>
                <p className="text-xs text-gray-500 mt-1">支持 PDF、DOC、DOCX、JPG、PNG 格式</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defense-deadline">提交期限</Label>
              <Input id="defense-deadline" type="date" />
            </div>
          </div>
        );

      case 'mediation-application':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mediation-reason">申请调解原因</Label>
              <Textarea
                id="mediation-reason"
                placeholder="请说明申请调解的原因和期望..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediation-scope">调解范围</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择调解范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">全部争议</SelectItem>
                  <SelectItem value="partial">部分争议</SelectItem>
                  <SelectItem value="specific">特定事项</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediator-preference">调解员偏好</Label>
              <Textarea
                id="mediator-preference"
                placeholder="请说明对调解员的要求或偏好..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediation-timeline">期望调解时间</Label>
              <Input id="mediation-timeline" type="date" />
            </div>
          </div>
        );

      case 'case-withdrawal':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  <strong>重要提示：</strong>撤案申请一旦提交并获得批准，将无法恢复。请谨慎操作。
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-reason">撤案原因</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="选择撤案原因" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="settlement">双方已达成和解</SelectItem>
                  <SelectItem value="jurisdiction">管辖权问题</SelectItem>
                  <SelectItem value="evidence">证据不足</SelectItem>
                  <SelectItem value="other">其他原因</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-details">详细说明</Label>
              <Textarea
                id="withdrawal-details"
                placeholder="请详细说明撤案的具体原因..."
                rows={5}
              />
            </div>
          </div>
        );

      default:
        return <div>功能开发中...</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getModalTitle(type)}</DialogTitle>
          <DialogDescription>
            案件编号：{caseId}
          </DialogDescription>
        </DialogHeader>

        {renderModalContent()}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
