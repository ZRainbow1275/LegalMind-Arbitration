// dev/src/components/modals/case-edit-modal.tsx

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  X, 
  User, 
  Building, 
  FileText, 
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { ArbitrationCase } from '@/types';
import { useCasesStore } from '@/store';
import { toast } from '@/lib/toast';

interface CaseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: ArbitrationCase;
}

export function CaseEditModal({ isOpen, onClose, caseData }: CaseEditModalProps) {
  const { updateCase } = useCasesStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    title: caseData.title,
    description: caseData.description,
    caseType: caseData.caseType,
    disputeAmount: caseData.disputeAmount.toString(),
    status: caseData.status,
    deadline: caseData.deadline ? new Date(caseData.deadline).toISOString().split('T')[0] : '',
    // 当事人信息（简化版）
    applicantInfo: {
      name: '申请人姓名', // 这里应该从实际数据获取
      type: 'individual' as 'individual' | 'company',
      contact: '联系方式'
    },
    respondentInfo: {
      name: '被申请人姓名',
      type: 'individual' as 'individual' | 'company', 
      contact: '联系方式'
    }
  });

  // 重置表单数据
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: caseData.title,
        description: caseData.description,
        caseType: caseData.caseType,
        disputeAmount: caseData.disputeAmount.toString(),
        status: caseData.status,
        deadline: caseData.deadline ? new Date(caseData.deadline).toISOString().split('T')[0] : '',
        applicantInfo: {
          name: '申请人姓名',
          type: 'individual',
          contact: '联系方式'
        },
        respondentInfo: {
          name: '被申请人姓名',
          type: 'individual',
          contact: '联系方式'
        }
      });
    }
  }, [isOpen, caseData]);

  // 处理表单提交
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 验证必填字段
      if (!formData.title.trim()) {
        toast.error('请输入案件标题');
        return;
      }
      if (!formData.caseType) {
        toast.error('请选择案件类型');
        return;
      }
      if (!formData.disputeAmount || isNaN(Number(formData.disputeAmount))) {
        toast.error('请输入有效的争议金额');
        return;
      }

      // 更新案件数据
      const updatedCase: Partial<ArbitrationCase> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        caseType: formData.caseType,
        disputeAmount: Number(formData.disputeAmount),
        status: formData.status,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        updatedAt: new Date()
      };

      updateCase(caseData.id, updatedCase);
      
      toast.success('案件信息已更新');
      onClose();
    } catch (error) {
      console.error('更新案件失败:', error);
      toast.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取状态显示文本和颜色
  const getStatusInfo = (status: string) => {
    const statusMap = {
      'draft': { text: '草稿', color: 'bg-gray-100 text-gray-800' },
      'submitted': { text: '已提交', color: 'bg-blue-100 text-blue-800' },
      'accepted': { text: '已受理', color: 'bg-green-100 text-green-800' },
      'payment_pending': { text: '待缴费', color: 'bg-yellow-100 text-yellow-800' },
      'tribunal_formation': { text: '仲裁庭组成', color: 'bg-purple-100 text-purple-800' },
      'pre_hearing': { text: '庭前准备', color: 'bg-indigo-100 text-indigo-800' },
      'hearing_scheduled': { text: '庭审进行', color: 'bg-orange-100 text-orange-800' },
      'hearing_in_progress': { text: '庭审中', color: 'bg-red-100 text-red-800' },
      'deliberation': { text: '合议中', color: 'bg-pink-100 text-pink-800' },
      'award_issued': { text: '裁决书已出', color: 'bg-teal-100 text-teal-800' },
      'completed': { text: '已完成', color: 'bg-green-100 text-green-800' },
      'terminated': { text: '已终止', color: 'bg-gray-100 text-gray-800' }
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, color: 'bg-gray-100 text-gray-800' };
  };

  const statusInfo = getStatusInfo(formData.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            编辑案件信息
            <Badge className={statusInfo.color}>
              {statusInfo.text}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="parties">当事人</TabsTrigger>
            <TabsTrigger value="status">状态管理</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">案件基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">案件标题 *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="请输入案件标题"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseType">案件类型 *</Label>
                    <Select
                      value={formData.caseType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, caseType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择案件类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="合同纠纷">合同纠纷</SelectItem>
                        <SelectItem value="建设工程纠纷">建设工程纠纷</SelectItem>
                        <SelectItem value="买卖合同纠纷">买卖合同纠纷</SelectItem>
                        <SelectItem value="服务合同纠纷">服务合同纠纷</SelectItem>
                        <SelectItem value="劳动争议">劳动争议</SelectItem>
                        <SelectItem value="知识产权纠纷">知识产权纠纷</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="disputeAmount">争议金额 (元) *</Label>
                    <Input
                      id="disputeAmount"
                      type="number"
                      value={formData.disputeAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, disputeAmount: e.target.value }))}
                      placeholder="请输入争议金额"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">案件期限</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">案件描述</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="请输入案件描述"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parties" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    申请人信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>姓名/名称</Label>
                    <Input
                      value={formData.applicantInfo.name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        applicantInfo: { ...prev.applicantInfo, name: e.target.value }
                      }))}
                      placeholder="请输入申请人姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>类型</Label>
                    <Select
                      value={formData.applicantInfo.type}
                      onValueChange={(value: 'individual' | 'company') => 
                        setFormData(prev => ({
                          ...prev,
                          applicantInfo: { ...prev.applicantInfo, type: value }
                        }))
                      }
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
                  <div className="space-y-2">
                    <Label>联系方式</Label>
                    <Input
                      value={formData.applicantInfo.contact}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        applicantInfo: { ...prev.applicantInfo, contact: e.target.value }
                      }))}
                      placeholder="请输入联系方式"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    被申请人信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>姓名/名称</Label>
                    <Input
                      value={formData.respondentInfo.name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        respondentInfo: { ...prev.respondentInfo, name: e.target.value }
                      }))}
                      placeholder="请输入被申请人姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>类型</Label>
                    <Select
                      value={formData.respondentInfo.type}
                      onValueChange={(value: 'individual' | 'company') => 
                        setFormData(prev => ({
                          ...prev,
                          respondentInfo: { ...prev.respondentInfo, type: value }
                        }))
                      }
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
                  <div className="space-y-2">
                    <Label>联系方式</Label>
                    <Input
                      value={formData.respondentInfo.contact}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        respondentInfo: { ...prev.respondentInfo, contact: e.target.value }
                      }))}
                      placeholder="请输入联系方式"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">案件状态管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">案件状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: value as ArbitrationCase['status'],
                      }))
                    }
                    >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="submitted">已提交</SelectItem>
                      <SelectItem value="accepted">已受理</SelectItem>
                      <SelectItem value="payment_pending">待缴费</SelectItem>
                      <SelectItem value="tribunal_formation">仲裁庭组成</SelectItem>
                      <SelectItem value="pre_hearing">庭前准备</SelectItem>
                      <SelectItem value="hearing_scheduled">庭审进行</SelectItem>
                      <SelectItem value="hearing_in_progress">庭审中</SelectItem>
                      <SelectItem value="deliberation">合议中</SelectItem>
                      <SelectItem value="award_issued">裁决书已出</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="terminated">已终止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">状态变更说明</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        修改案件状态将影响案件的处理流程和相关功能的可用性。请确保状态变更符合实际情况。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? '保存中...' : '保存更改'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
