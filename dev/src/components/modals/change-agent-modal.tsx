// dev/src/components/modals/change-agent-modal.tsx

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
  UserX, 
  UserPlus, 
  FileText, 
  Upload, 
  Calendar, 
  Clock, 
  X, 
  Save,
  Info,
  Phone,
  Mail,
  MapPin,
  Building,
  User
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface ChangeAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

interface Agent {
  id: string;
  name: string;
  type: 'lawyer' | 'legal_worker' | 'other';
  licenseNumber?: string;
  lawFirm?: string;
  phone: string;
  email: string;
  address: string;
  idNumber: string;
  authorizationScope: string;
  authorizationPeriod: {
    start: string;
    end: string;
  };
}

export function ChangeAgentModal({ isOpen, onClose, caseId }: ChangeAgentModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [changeType, setChangeType] = useState('');
  const [changeReason, setChangeReason] = useState('');
  
  // 当前代理人（模拟数据）
  const [currentAgents] = useState<Agent[]>([
    {
      id: '1',
      name: '张律师',
      type: 'lawyer',
      licenseNumber: '13601201910001234',
      lawFirm: '江西某律师事务所',
      phone: '138****1234',
      email: 'zhang@law.com',
      address: '南昌市红谷滩新区',
      idNumber: '360121********1234',
      authorizationScope: '代理仲裁案件的全部事务',
      authorizationPeriod: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    }
  ]);

  // 新代理人信息
  const [newAgent, setNewAgent] = useState<Partial<Agent>>({
    name: '',
    type: 'lawyer',
    licenseNumber: '',
    lawFirm: '',
    phone: '',
    email: '',
    address: '',
    idNumber: '',
    authorizationScope: '',
    authorizationPeriod: {
      start: '',
      end: ''
    }
  });

  // 变更类型选项
  const changeTypes = [
    { value: 'replace', label: '更换代理人' },
    { value: 'add', label: '增加代理人' },
    { value: 'remove', label: '解除代理' },
    { value: 'modify_scope', label: '变更代理权限' }
  ];

  // 代理人类型选项
  const agentTypes = [
    { value: 'lawyer', label: '律师' },
    { value: 'legal_worker', label: '法律工作者' },
    { value: 'other', label: '其他' }
  ];

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

      // 如果是新增或更换代理人，验证新代理人信息
      if (changeType === 'replace' || changeType === 'add') {
        if (!newAgent.name?.trim()) {
          toast.error('请填写代理人姓名');
          return;
        }
        if (!newAgent.phone?.trim()) {
          toast.error('请填写联系电话');
          return;
        }
        if (!newAgent.idNumber?.trim()) {
          toast.error('请填写身份证号');
          return;
        }
        if (newAgent.type === 'lawyer' && !newAgent.licenseNumber?.trim()) {
          toast.error('律师请填写执业证号');
          return;
        }
      }

      // 模拟提交变更申请
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('代理人变更申请已提交，等待审核');
      onClose();
      
      // 重置表单
      setChangeType('');
      setChangeReason('');
      setNewAgent({
        name: '',
        type: 'lawyer',
        licenseNumber: '',
        lawFirm: '',
        phone: '',
        email: '',
        address: '',
        idNumber: '',
        authorizationScope: '',
        authorizationPeriod: {
          start: '',
          end: ''
        }
      });
    } catch (error) {
      console.error('提交变更申请失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserX className="h-5 w-5 text-purple-500" />
            变更委托代理人
            <Badge variant="outline" className="ml-2">
              案件: {caseId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 重要提示 */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900">变更说明</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    代理人变更需要提交相关证明材料，变更后的代理人将获得相应的代理权限。
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
                  placeholder="请详细说明变更代理人的理由..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 代理人信息 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">当前代理人</TabsTrigger>
              <TabsTrigger value="new">新代理人</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">当前委托代理人</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentAgents.map((agent, index) => (
                      <div key={agent.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            代理人 {index + 1}
                          </h4>
                          <Badge variant={agent.type === 'lawyer' ? 'default' : 'secondary'}>
                            {agentTypes.find(t => t.value === agent.type)?.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>姓名：</strong>{agent.name}</p>
                            <p><strong>身份证号：</strong>{agent.idNumber}</p>
                            {agent.licenseNumber && (
                              <p><strong>执业证号：</strong>{agent.licenseNumber}</p>
                            )}
                            {agent.lawFirm && (
                              <p><strong>所属机构：</strong>{agent.lawFirm}</p>
                            )}
                          </div>
                          <div>
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {agent.phone}
                            </p>
                            <p className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {agent.email}
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {agent.address}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm"><strong>代理权限：</strong>{agent.authorizationScope}</p>
                          <p className="text-sm">
                            <strong>代理期限：</strong>
                            {agent.authorizationPeriod.start} 至 {agent.authorizationPeriod.end}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">新委托代理人信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newAgentName">姓名 *</Label>
                      <Input
                        id="newAgentName"
                        value={newAgent.name || ''}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="请输入代理人姓名"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newAgentType">代理人类型 *</Label>
                      <Select
                        value={newAgent.type}
                        onValueChange={(value: 'lawyer' | 'legal_worker' | 'other') => 
                          setNewAgent(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {agentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newAgentId">身份证号 *</Label>
                      <Input
                        id="newAgentId"
                        value={newAgent.idNumber || ''}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, idNumber: e.target.value }))}
                        placeholder="请输入身份证号"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newAgentPhone">联系电话 *</Label>
                      <Input
                        id="newAgentPhone"
                        value={newAgent.phone || ''}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="请输入联系电话"
                      />
                    </div>
                  </div>

                  {newAgent.type === 'lawyer' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newAgentLicense">执业证号 *</Label>
                        <Input
                          id="newAgentLicense"
                          value={newAgent.licenseNumber || ''}
                          onChange={(e) => setNewAgent(prev => ({ ...prev, licenseNumber: e.target.value }))}
                          placeholder="请输入律师执业证号"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newAgentFirm">律师事务所</Label>
                        <Input
                          id="newAgentFirm"
                          value={newAgent.lawFirm || ''}
                          onChange={(e) => setNewAgent(prev => ({ ...prev, lawFirm: e.target.value }))}
                          placeholder="请输入律师事务所名称"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newAgentEmail">电子邮箱</Label>
                      <Input
                        id="newAgentEmail"
                        type="email"
                        value={newAgent.email || ''}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="请输入电子邮箱"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newAgentAddress">通讯地址</Label>
                      <Input
                        id="newAgentAddress"
                        value={newAgent.address || ''}
                        onChange={(e) => setNewAgent(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="请输入通讯地址"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="authorizationScope">代理权限范围</Label>
                    <Textarea
                      id="authorizationScope"
                      value={newAgent.authorizationScope || ''}
                      onChange={(e) => setNewAgent(prev => ({ ...prev, authorizationScope: e.target.value }))}
                      placeholder="请详细描述委托代理的权限范围..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="authStart">代理期限开始</Label>
                      <Input
                        id="authStart"
                        type="date"
                        value={newAgent.authorizationPeriod?.start || ''}
                        onChange={(e) => setNewAgent(prev => ({
                          ...prev,
                          authorizationPeriod: {
                            ...prev.authorizationPeriod,
                            start: e.target.value,
                            end: prev.authorizationPeriod?.end || ''
                          }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authEnd">代理期限结束</Label>
                      <Input
                        id="authEnd"
                        type="date"
                        value={newAgent.authorizationPeriod?.end || ''}
                        onChange={(e) => setNewAgent(prev => ({
                          ...prev,
                          authorizationPeriod: {
                            ...prev.authorizationPeriod,
                            start: prev.authorizationPeriod?.start || '',
                            end: e.target.value
                          }
                        }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 附件上传 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                证明材料
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  上传文件
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 新代理人身份证复印件</p>
                <p>• 律师执业证复印件（律师）</p>
                <p>• 授权委托书</p>
                <p>• 原代理人解除委托书（更换代理人时）</p>
              </div>
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
            {loading ? '提交中...' : '提交变更申请'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
