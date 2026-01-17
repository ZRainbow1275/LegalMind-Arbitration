// dev/src/components/mediation/mediation-agreement.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotaryInterface } from '@/components/notary/notary-interface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Download,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  Signature,
  Send,
  Eye,
  Edit,
  Save,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';

interface MediationAgreementProps {
  mediationId: string;
  parties: Array<{
    id: string;
    name: string;
    type: 'applicant' | 'respondent';
    representative?: string;
    signed?: boolean;
    signedAt?: Date;
  }>;
  onAgreementSigned?: (partyId: string) => void;
  className?: string;
}

interface AgreementTerm {
  id: string;
  title: string;
  content: string;
  type: 'payment' | 'action' | 'timeline' | 'other';
  responsible: string;
  deadline?: string;
  amount?: number;
}

export function MediationAgreement({ 
  mediationId, 
  parties, 
  onAgreementSigned,
  className 
}: MediationAgreementProps) {
  const [agreementStatus, setAgreementStatus] = useState<'draft' | 'pending' | 'signed' | 'rejected'>('draft');
  const [showEditor, setShowEditor] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [showNotaryInterface, setShowNotaryInterface] = useState(false);
  const [agreementTerms, setAgreementTerms] = useState<AgreementTerm[]>([
    {
      id: 'term-1',
      title: '赔偿条款',
      content: '被申请人应向申请人支付违约金人民币50,000元',
      type: 'payment',
      responsible: 'respondent',
      deadline: '2024-02-15',
      amount: 50000
    },
    {
      id: 'term-2',
      title: '履行义务',
      content: '被申请人应在协议签署后30日内完成剩余工作交付',
      type: 'action',
      responsible: 'respondent',
      deadline: '2024-02-28'
    }
  ]);

  const [newTerm, setNewTerm] = useState({
    title: '',
    content: '',
    type: 'other' as AgreementTerm['type'],
    responsible: '',
    deadline: '',
    amount: ''
  });

  const [signatureData, setSignatureData] = useState({
    partyId: '',
    signatureMethod: 'electronic',
    confirmTerms: false,
    additionalNotes: ''
  });

  const allPartiesSigned = parties.every(party => party.signed);
  const signedCount = parties.filter(party => party.signed).length;

  const handleAddTerm = () => {
    if (!newTerm.title || !newTerm.content) return;

    const term: AgreementTerm = {
      id: `term-${Date.now()}`,
      title: newTerm.title,
      content: newTerm.content,
      type: newTerm.type,
      responsible: newTerm.responsible,
      deadline: newTerm.deadline || undefined,
      amount: newTerm.amount ? parseFloat(newTerm.amount) : undefined
    };

    setAgreementTerms(prev => [...prev, term]);
    setNewTerm({
      title: '',
      content: '',
      type: 'other',
      responsible: '',
      deadline: '',
      amount: ''
    });
  };

  const handleRemoveTerm = (termId: string) => {
    setAgreementTerms(prev => prev.filter(term => term.id !== termId));
  };

  const handleSignAgreement = () => {
    if (!signatureData.confirmTerms) {
      alert('请确认您已阅读并同意所有条款');
      return;
    }

    // 模拟签署过程
    onAgreementSigned?.(signatureData.partyId);
    setShowSignDialog(false);
    
    // 更新协议状态
    if (signedCount + 1 === parties.length) {
      setAgreementStatus('signed');
    } else {
      setAgreementStatus('pending');
    }
  };

  const getTermTypeColor = (type: AgreementTerm['type']) => {
    const colors = {
      payment: 'bg-green-100 text-green-800',
      action: 'bg-blue-100 text-blue-800',
      timeline: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type];
  };

  const getTermTypeLabel = (type: AgreementTerm['type']) => {
    const labels = {
      payment: '支付条款',
      action: '履行义务',
      timeline: '时间安排',
      other: '其他条款'
    };
    return labels[type];
  };

  const getStatusColor = (status: typeof agreementStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: typeof agreementStatus) => {
    const labels = {
      draft: '草稿',
      pending: '待签署',
      signed: '已签署',
      rejected: '已拒绝'
    };
    return labels[status];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 协议状态概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              调解协议
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(agreementStatus)}>
                {getStatusLabel(agreementStatus)}
              </Badge>
              <span className="text-sm text-gray-500">
                {signedCount}/{parties.length} 已签署
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{parties.length}</div>
              <div className="text-sm text-gray-600">参与方</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{signedCount}</div>
              <div className="text-sm text-gray-600">已签署</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold text-orange-600">{agreementTerms.length}</div>
              <div className="text-sm text-gray-600">协议条款</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 协议条款 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            协议条款
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditor(true)}
                disabled={agreementStatus === 'signed'}
              >
                <Edit className="h-4 w-4 mr-2" />
                编辑条款
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                下载协议
              </Button>
              {agreementStatus === 'signed' && (
                <Button
                  size="sm"
                  onClick={() => setShowNotaryInterface(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  申请公证
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agreementTerms.map((term, index) => (
              <div key={term.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      第{index + 1}条
                    </span>
                    <Badge variant="outline" className={getTermTypeColor(term.type)}>
                      {getTermTypeLabel(term.type)}
                    </Badge>
                  </div>
                  {agreementStatus === 'draft' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTerm(term.id)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <h4 className="font-medium mb-2">{term.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{term.content}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>责任方：{term.responsible === 'applicant' ? '申请人' : '被申请人'}</span>
                  {term.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {term.deadline}
                    </span>
                  )}
                  {term.amount && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ¥{term.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 签署状态 */}
      <Card>
        <CardHeader>
          <CardTitle>签署状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parties.map((party) => (
              <div key={party.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{party.name}</div>
                  <div className="text-sm text-gray-500">
                    {party.type === 'applicant' ? '申请人' : '被申请人'}
                    {party.representative && ` · 代理人：${party.representative}`}
                  </div>
                  {party.signedAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      签署时间：{party.signedAt.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {party.signed ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      已签署
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-orange-600">
                        <Clock className="h-3 w-3 mr-1" />
                        待签署
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedParty(party.id);
                          setSignatureData(prev => ({ ...prev, partyId: party.id }));
                          setShowSignDialog(true);
                        }}
                        disabled={agreementStatus === 'signed'}
                      >
                        <Signature className="h-4 w-4 mr-2" />
                        签署
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 签署对话框 */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>签署调解协议</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-800">签署须知</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    请仔细阅读所有协议条款，确认无误后进行电子签署。签署后协议即具有法律效力。
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm-terms"
                  checked={signatureData.confirmTerms}
                  onCheckedChange={(checked) =>
                    setSignatureData(prev => ({ ...prev, confirmTerms: checked as boolean }))
                  }
                />
                <Label htmlFor="confirm-terms" className="text-sm">
                  我已仔细阅读并同意上述所有协议条款
                </Label>
              </div>

              <div>
                <Label htmlFor="additional-notes">补充说明（可选）</Label>
                <Textarea
                  id="additional-notes"
                  value={signatureData.additionalNotes}
                  onChange={(e) =>
                    setSignatureData(prev => ({ ...prev, additionalNotes: e.target.value }))
                  }
                  placeholder="如有补充说明或特殊要求，请在此填写..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSignDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleSignAgreement}
                disabled={!signatureData.confirmTerms}
                className="bg-green-600 hover:bg-green-700"
              >
                <Signature className="h-4 w-4 mr-2" />
                确认签署
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 公证申请对话框 */}
      <Dialog open={showNotaryInterface} onOpenChange={setShowNotaryInterface}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申请协议公证</DialogTitle>
          </DialogHeader>
          <NotaryInterface
            caseId={mediationId}
            onNotaryComplete={(notaryId) => {
              console.log('公证申请完成:', notaryId);
              setShowNotaryInterface(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
