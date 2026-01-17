// dev/src/components/modals/change-arbitration-request-modal.tsx

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Edit, 
  Plus, 
  Minus, 
  FileText, 
  DollarSign, 
  Calendar, 
  Clock, 
  X, 
  Save,
  Info,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface ChangeArbitrationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

interface ArbitrationRequest {
  id: string;
  type: 'monetary' | 'non-monetary';
  description: string;
  amount?: number;
  legalBasis: string;
  factualBasis: string;
}

export function ChangeArbitrationRequestModal({ isOpen, onClose, caseId }: ChangeArbitrationRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('modify');
  
  // 原始仲裁请求（模拟数据）
  const [originalRequests] = useState<ArbitrationRequest[]>([
    {
      id: '1',
      type: 'monetary',
      description: '支付工程款',
      amount: 500000,
      legalBasis: '《合同法》第107条',
      factualBasis: '根据建设工程合同约定，被申请人应支付工程款500,000元'
    },
    {
      id: '2',
      type: 'non-monetary',
      description: '继续履行合同',
      legalBasis: '《合同法》第110条',
      factualBasis: '被申请人应当按照合同约定继续履行剩余工程'
    }
  ]);

  // 变更后的仲裁请求
  const [modifiedRequests, setModifiedRequests] = useState<ArbitrationRequest[]>([...originalRequests]);
  const [newRequests, setNewRequests] = useState<ArbitrationRequest[]>([]);
  
  const [changeReason, setChangeReason] = useState('');
  const [changeType, setChangeType] = useState('');

  // 变更类型选项
  const changeTypes = [
    { value: 'modify', label: '修改现有请求' },
    { value: 'add', label: '追加新请求' },
    { value: 'reduce', label: '减少请求' },
    { value: 'replace', label: '替换请求' }
  ];

  // 添加新请求
  const addNewRequest = () => {
    const newRequest: ArbitrationRequest = {
      id: Date.now().toString(),
      type: 'monetary',
      description: '',
      amount: 0,
      legalBasis: '',
      factualBasis: ''
    };
    setNewRequests(prev => [...prev, newRequest]);
  };

  // 删除新请求
  const removeNewRequest = (id: string) => {
    setNewRequests(prev => prev.filter(req => req.id !== id));
  };

  // 更新新请求
  const updateNewRequest = (id: string, updates: Partial<ArbitrationRequest>) => {
    setNewRequests(prev => prev.map(req => 
      req.id === id ? { ...req, ...updates } : req
    ));
  };

  // 更新修改的请求
  const updateModifiedRequest = (id: string, updates: Partial<ArbitrationRequest>) => {
    setModifiedRequests(prev => prev.map(req => 
      req.id === id ? { ...req, ...updates } : req
    ));
  };

  // 处理表单提交
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 验证必填字段
      if (!changeType) {
        toast.error('请选择变更类型');
        return;
      }
      if (!changeReason.trim()) {
        toast.error('请填写变更理由');
        return;
      }

      // 验证新增请求的完整性
      for (const request of newRequests) {
        if (!request.description.trim()) {
          toast.error('请完善新增请求的描述');
          return;
        }
        if (request.type === 'monetary' && (!request.amount || request.amount <= 0)) {
          toast.error('请填写有效的金额');
          return;
        }
      }

      // 模拟提交变更申请
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('仲裁请求变更申请已提交，等待仲裁庭审查');
      onClose();
      
      // 重置表单
      setModifiedRequests([...originalRequests]);
      setNewRequests([]);
      setChangeReason('');
      setChangeType('');
    } catch (error) {
      console.error('提交变更申请失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-5 w-5 text-blue-500" />
            变更仲裁请求
            <Badge variant="outline" className="ml-2">
              案件: {caseId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 重要提示 */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">变更说明</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    仲裁请求的变更需要仲裁庭同意。变更可能影响仲裁费用的计算和案件审理进程。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 变更基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">变更基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="changeType">变更类型 *</Label>
                  <Select
                    value={changeType}
                    onValueChange={setChangeType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择变更类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {changeTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>申请日期</Label>
                  <Input
                    value={new Date().toLocaleDateString()}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="changeReason">变更理由 *</Label>
                <Textarea
                  id="changeReason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="请详细说明变更仲裁请求的理由..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 仲裁请求对比 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="original">原始请求</TabsTrigger>
              <TabsTrigger value="modify">修改请求</TabsTrigger>
              <TabsTrigger value="add">追加请求</TabsTrigger>
            </TabsList>

            <TabsContent value="original" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">原始仲裁请求</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {originalRequests.map((request, index) => (
                      <div key={request.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">请求 {index + 1}</h4>
                          <Badge variant={request.type === 'monetary' ? 'default' : 'secondary'}>
                            {request.type === 'monetary' ? '金钱给付' : '非金钱给付'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p><strong>请求内容：</strong>{request.description}</p>
                          {request.amount && (
                            <p><strong>金额：</strong>¥{request.amount.toLocaleString()}</p>
                          )}
                          <p><strong>法律依据：</strong>{request.legalBasis}</p>
                          <p><strong>事实依据：</strong>{request.factualBasis}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modify" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">修改仲裁请求</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modifiedRequests.map((request, index) => (
                      <div key={request.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">请求 {index + 1}</h4>
                          <Select
                            value={request.type}
                            onValueChange={(value: 'monetary' | 'non-monetary') => 
                              updateModifiedRequest(request.id, { type: value })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monetary">金钱给付</SelectItem>
                              <SelectItem value="non-monetary">非金钱给付</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label>请求内容</Label>
                            <Textarea
                              value={request.description}
                              onChange={(e) => updateModifiedRequest(request.id, { description: e.target.value })}
                              rows={2}
                            />
                          </div>
                          {request.type === 'monetary' && (
                            <div>
                              <Label>金额 (元)</Label>
                              <Input
                                type="number"
                                value={request.amount || 0}
                                onChange={(e) => updateModifiedRequest(request.id, { amount: Number(e.target.value) })}
                              />
                            </div>
                          )}
                          <div>
                            <Label>法律依据</Label>
                            <Input
                              value={request.legalBasis}
                              onChange={(e) => updateModifiedRequest(request.id, { legalBasis: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>事实依据</Label>
                            <Textarea
                              value={request.factualBasis}
                              onChange={(e) => updateModifiedRequest(request.id, { factualBasis: e.target.value })}
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    追加仲裁请求
                    <Button variant="outline" size="sm" onClick={addNewRequest}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加请求
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {newRequests.length > 0 ? (
                    <div className="space-y-4">
                      {newRequests.map((request, index) => (
                        <div key={request.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium">新请求 {index + 1}</h4>
                            <div className="flex items-center gap-2">
                              <Select
                                value={request.type}
                                onValueChange={(value: 'monetary' | 'non-monetary') => 
                                  updateNewRequest(request.id, { type: value })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="monetary">金钱给付</SelectItem>
                                  <SelectItem value="non-monetary">非金钱给付</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNewRequest(request.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label>请求内容 *</Label>
                              <Textarea
                                value={request.description}
                                onChange={(e) => updateNewRequest(request.id, { description: e.target.value })}
                                placeholder="请描述具体的仲裁请求..."
                                rows={2}
                              />
                            </div>
                            {request.type === 'monetary' && (
                              <div>
                                <Label>金额 (元) *</Label>
                                <Input
                                  type="number"
                                  value={request.amount || 0}
                                  onChange={(e) => updateNewRequest(request.id, { amount: Number(e.target.value) })}
                                  placeholder="请输入金额"
                                />
                              </div>
                            )}
                            <div>
                              <Label>法律依据</Label>
                              <Input
                                value={request.legalBasis}
                                onChange={(e) => updateNewRequest(request.id, { legalBasis: e.target.value })}
                                placeholder="请引用相关法律条文..."
                              />
                            </div>
                            <div>
                              <Label>事实依据</Label>
                              <Textarea
                                value={request.factualBasis}
                                onChange={(e) => updateNewRequest(request.id, { factualBasis: e.target.value })}
                                placeholder="请说明支持该请求的事实..."
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无追加请求，点击“添加请求”按钮开始添加</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
            {loading ? '提交中...' : '提交变更申请'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
