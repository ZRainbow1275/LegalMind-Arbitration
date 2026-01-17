// dev/src/components/modals/jurisdiction-objection-modal.tsx

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Clock, 
  Upload, 
  X, 
  Save,
  Info,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface JurisdictionObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

export function JurisdictionObjectionModal({ isOpen, onClose, caseId }: JurisdictionObjectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    objectionType: '',
    objectionReason: '',
    legalBasis: '',
    factualBasis: '',
    requestedAction: '',
    supportingDocuments: [] as Array<{
      id: string;
      name: string;
      type: string;
      size: number;
    }>,
    submissionDeadline: '',
    contactInfo: {
      name: '',
      phone: '',
      email: '',
      address: ''
    }
  });

  // 管辖异议类型选项
  const objectionTypes = [
    { value: 'no-arbitration-agreement', label: '无仲裁协议' },
    { value: 'invalid-arbitration-agreement', label: '仲裁协议无效' },
    { value: 'beyond-scope', label: '超出仲裁协议范围' },
    { value: 'wrong-institution', label: '仲裁机构错误' },
    { value: 'procedural-violation', label: '程序违法' },
    { value: 'other', label: '其他' }
  ];

  // 处理表单提交
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 验证必填字段
      if (!formData.objectionType) {
        toast.error('请选择异议类型');
        return;
      }
      if (!formData.objectionReason.trim()) {
        toast.error('请填写异议理由');
        return;
      }
      if (!formData.legalBasis.trim()) {
        toast.error('请填写法律依据');
        return;
      }

      // 模拟提交管辖异议
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('管辖异议已提交，等待仲裁庭审理');
      onClose();
      
      // 重置表单
      setFormData({
        objectionType: '',
        objectionReason: '',
        legalBasis: '',
        factualBasis: '',
        requestedAction: '',
        supportingDocuments: [],
        submissionDeadline: '',
        contactInfo: {
          name: '',
          phone: '',
          email: '',
          address: ''
        }
      });
    } catch (error) {
      console.error('提交管辖异议失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = () => {
    // 模拟文件上传
    const newFile = {
      id: Date.now().toString(),
      name: `支持文件_${Date.now()}.pdf`,
      type: 'application/pdf',
      size: Math.floor(Math.random() * 1000000) + 100000
    };
    
    setFormData(prev => ({
      ...prev,
      supportingDocuments: [...prev.supportingDocuments, newFile]
    }));
    
    toast.success('文件上传成功');
  };

  // 删除文件
  const handleFileDelete = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      supportingDocuments: prev.supportingDocuments.filter(file => file.id !== fileId)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            管辖异议申请
            <Badge variant="outline" className="ml-2">
              案件: {caseId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 重要提示 */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900">重要提示</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    管辖异议应当在首次开庭前提出。一旦提出管辖异议，仲裁程序将暂停，等待仲裁庭对管辖权问题作出决定。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 异议基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">异议基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objectionType">异议类型 *</Label>
                  <Select
                    value={formData.objectionType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, objectionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择异议类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submissionDeadline">提交期限</Label>
                  <Input
                    id="submissionDeadline"
                    type="date"
                    value={formData.submissionDeadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, submissionDeadline: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectionReason">异议理由 *</Label>
                <Textarea
                  id="objectionReason"
                  value={formData.objectionReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, objectionReason: e.target.value }))}
                  placeholder="请详细说明提出管辖异议的具体理由..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legalBasis">法律依据 *</Label>
                <Textarea
                  id="legalBasis"
                  value={formData.legalBasis}
                  onChange={(e) => setFormData(prev => ({ ...prev, legalBasis: e.target.value }))}
                  placeholder="请引用相关的法律条文和司法解释..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="factualBasis">事实依据</Label>
                <Textarea
                  id="factualBasis"
                  value={formData.factualBasis}
                  onChange={(e) => setFormData(prev => ({ ...prev, factualBasis: e.target.value }))}
                  placeholder="请说明支持异议的事实情况..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedAction">请求事项</Label>
                <Textarea
                  id="requestedAction"
                  value={formData.requestedAction}
                  onChange={(e) => setFormData(prev => ({ ...prev, requestedAction: e.target.value }))}
                  placeholder="请明确您希望仲裁庭作出的决定..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* 联系信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">联系信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">联系人姓名</Label>
                  <Input
                    id="contactName"
                    value={formData.contactInfo.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, name: e.target.value }
                    }))}
                    placeholder="请输入联系人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">联系电话</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactInfo.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, phone: e.target.value }
                    }))}
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">电子邮箱</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactInfo.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, email: e.target.value }
                    }))}
                    placeholder="请输入电子邮箱"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactAddress">通讯地址</Label>
                  <Input
                    id="contactAddress"
                    value={formData.contactInfo.address}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, address: e.target.value }
                    }))}
                    placeholder="请输入通讯地址"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 支持文件 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                支持文件
                <Button variant="outline" size="sm" onClick={handleFileUpload}>
                  <Upload className="h-4 w-4 mr-2" />
                  上传文件
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.supportingDocuments.length > 0 ? (
                <div className="space-y-2">
                  {formData.supportingDocuments.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDelete(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  暂无上传文件，点击上传按钮添加支持文件
                </p>
              )}
            </CardContent>
          </Card>
        </div>

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
            {loading ? '提交中...' : '提交异议'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
