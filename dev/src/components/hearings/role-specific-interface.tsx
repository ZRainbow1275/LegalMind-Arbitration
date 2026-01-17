// dev/src/components/hearings/role-specific-interface.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Gavel,
  Hand,
  Mic,
  MicOff,
  Video,
  VideoOff,
  FileText,
  Upload,
  Download,
  MessageSquare,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle
} from 'lucide-react';

interface RoleSpecificInterfaceProps {
  role: 'arbitrator' | 'applicant' | 'respondent' | 'witness' | 'observer';
  hearingType: 'arbitration' | 'mediation';
  isHost?: boolean;
  onAction?: (action: string, data?: unknown) => void;
  className?: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
  canToggle: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  onClick: () => void;
}

export function RoleSpecificInterface({ 
  role, 
  hearingType, 
  isHost = false, 
  onAction,
  className 
}: RoleSpecificInterfaceProps) {
  const [showRaiseHand, setShowRaiseHand] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [speakingPermission, setSpeakingPermission] = useState(false);
  
  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    description: '',
    type: 'document',
    urgent: false
  });

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'speak',
      name: '发言权限',
      description: '允许在庭审中发言',
      granted: role === 'arbitrator',
      canToggle: role === 'arbitrator'
    },
    {
      id: 'evidence',
      name: '举证权限',
      description: '允许提交和展示证据',
      granted: ['arbitrator', 'applicant', 'respondent'].includes(role),
      canToggle: role === 'arbitrator'
    },
    {
      id: 'question',
      name: '质证权限',
      description: '允许对证据进行质证',
      granted: ['arbitrator', 'applicant', 'respondent'].includes(role),
      canToggle: role === 'arbitrator'
    },
    {
      id: 'record',
      name: '记录权限',
      description: '允许查看庭审记录',
      granted: role !== 'observer',
      canToggle: role === 'arbitrator'
    }
  ]);

  const getRoleLabel = (role: string) => {
    const labels = {
      arbitrator: hearingType === 'arbitration' ? '仲裁员' : '调解员',
      applicant: '申请人',
      respondent: '被申请人',
      witness: '证人',
      observer: '旁听人'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      arbitrator: 'bg-purple-100 text-purple-800',
      applicant: 'bg-blue-100 text-blue-800',
      respondent: 'bg-orange-100 text-orange-800',
      witness: 'bg-green-100 text-green-800',
      observer: 'bg-gray-100 text-gray-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [];

    // 仲裁员/调解员专用功能
    if (role === 'arbitrator') {
      baseActions.push(
        {
          id: 'manage-permissions',
          label: '权限管理',
          icon: <Settings className="h-4 w-4" />,
          description: '管理参与者权限',
          available: true,
          onClick: () => setShowPermissionDialog(true)
        },
        {
          id: 'control-procedure',
          label: '程序控制',
          icon: <Gavel className="h-4 w-4" />,
          description: '控制庭审程序进度',
          available: true,
          onClick: () => onAction?.('control-procedure')
        },
        {
          id: 'mute-all',
          label: '全员静音',
          icon: <MicOff className="h-4 w-4" />,
          description: '静音所有参与者',
          available: true,
          onClick: () => onAction?.('mute-all')
        }
      );
    }

    // 当事人专用功能
    if (['applicant', 'respondent'].includes(role)) {
      baseActions.push(
        {
          id: 'raise-hand',
          label: handRaised ? '取消举手' : '举手发言',
          icon: <Hand className={`h-4 w-4 ${handRaised ? 'text-orange-500' : ''}`} />,
          description: '请求发言权限',
          available: true,
          onClick: () => {
            setHandRaised(!handRaised);
            onAction?.('raise-hand', { raised: !handRaised });
          }
        },
        {
          id: 'submit-evidence',
          label: '提交证据',
          icon: <FileText className="h-4 w-4" />,
          description: '提交新的证据材料',
          available: permissions.find(p => p.id === 'evidence')?.granted || false,
          onClick: () => setShowEvidenceDialog(true)
        }
      );
    }

    // 证人专用功能
    if (role === 'witness') {
      baseActions.push(
        {
          id: 'request-speak',
          label: '请求发言',
          icon: <MessageSquare className="h-4 w-4" />,
          description: '请求发言权限',
          available: true,
          onClick: () => onAction?.('request-speak')
        }
      );
    }

    // 通用功能
    baseActions.push(
      {
        id: 'view-materials',
        label: '查看材料',
        icon: <Eye className="h-4 w-4" />,
        description: '查看案件材料',
        available: permissions.find(p => p.id === 'record')?.granted || false,
        onClick: () => onAction?.('view-materials')
      },
      {
        id: 'technical-support',
        label: '技术支持',
        icon: <HelpCircle className="h-4 w-4" />,
        description: '获取技术帮助',
        available: true,
        onClick: () => onAction?.('technical-support')
      }
    );

    return baseActions;
  };

  const handleSubmitEvidence = () => {
    if (!evidenceForm.title) return;

    onAction?.('submit-evidence', evidenceForm);
    setShowEvidenceDialog(false);
    setEvidenceForm({
      title: '',
      description: '',
      type: 'document',
      urgent: false
    });
  };

  const handleTogglePermission = (permissionId: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === permissionId ? { ...p, granted: !p.granted } : p
    ));
    onAction?.('toggle-permission', { permissionId, granted: !permissions.find(p => p.id === permissionId)?.granted });
  };

  const quickActions = getQuickActions();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 角色身份卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              我的身份
            </div>
            <Badge className={getRoleColor(role)}>
              {getRoleLabel(role)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* 当前状态 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">发言状态</span>
              <div className="flex items-center gap-2">
                {speakingPermission ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Mic className="h-3 w-3 mr-1" />
                    可发言
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-600">
                    <MicOff className="h-3 w-3 mr-1" />
                    静音中
                  </Badge>
                )}
              </div>
            </div>

            {/* 举手状态 */}
            {['applicant', 'respondent'].includes(role) && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">举手状态</span>
                <div className="flex items-center gap-2">
                  {handRaised ? (
                    <Badge className="bg-orange-100 text-orange-800">
                      <Hand className="h-3 w-3 mr-1" />
                      已举手
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      未举手
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* 权限状态 */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">当前权限</div>
              <div className="grid grid-cols-2 gap-2">
                {permissions.filter(p => p.granted).map((permission) => (
                  <Badge key={permission.id} variant="outline" className="text-xs justify-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {permission.name.replace('权限', '')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant={action.id === 'raise-hand' && handRaised ? 'default' : 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={!action.available}
                className="justify-start h-auto p-3"
              >
                <div className="flex items-center gap-3 w-full">
                  {action.icon}
                  <div className="text-left">
                    <div className="font-medium">{action.label}</div>
                    <div className="text-xs text-gray-500">{action.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 仲裁员专用：权限管理对话框 */}
      {role === 'arbitrator' && (
        <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>权限管理</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                管理参与者的各项权限，确保庭审秩序
              </div>
              <div className="space-y-3">
                {permissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{permission.name}</div>
                      <div className="text-sm text-gray-600">{permission.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {permission.granted ? (
                        <Badge className="bg-green-100 text-green-800">已授权</Badge>
                      ) : (
                        <Badge variant="outline">未授权</Badge>
                      )}
                      {permission.canToggle && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePermission(permission.id)}
                        >
                          {permission.granted ? '撤销' : '授权'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowPermissionDialog(false)}>
                  关闭
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 当事人专用：证据提交对话框 */}
      {['applicant', 'respondent'].includes(role) && (
        <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>提交证据</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="evidence-title">证据标题</Label>
                <Input
                  id="evidence-title"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请输入证据标题"
                />
              </div>
              
              <div>
                <Label htmlFor="evidence-type">证据类型</Label>
                <Select
                  value={evidenceForm.type}
                  onValueChange={(value) => setEvidenceForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">书证</SelectItem>
                    <SelectItem value="physical">物证</SelectItem>
                    <SelectItem value="audio">音频证据</SelectItem>
                    <SelectItem value="video">视频证据</SelectItem>
                    <SelectItem value="electronic">电子证据</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="evidence-description">证据说明</Label>
                <Textarea
                  id="evidence-description"
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请说明证据的内容和证明目的"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={evidenceForm.urgent}
                  onChange={(e) => setEvidenceForm(prev => ({ ...prev, urgent: e.target.checked }))}
                />
                <Label htmlFor="urgent" className="text-sm">
                  紧急证据（需要立即展示）
                </Label>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm text-gray-600">
                  点击上传证据文件或拖拽文件到此处
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  支持 PDF、Word、图片、音频、视频等格式
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmitEvidence}>
                  <FileText className="h-4 w-4 mr-2" />
                  提交证据
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 状态提示 */}
      {handRaised && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <Hand className="h-4 w-4" />
              <span className="text-sm font-medium">您已举手，等待{getRoleLabel('arbitrator')}允许发言</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!speakingPermission && ['applicant', 'respondent'].includes(role) && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-gray-600">
              <MicOff className="h-4 w-4" />
              <span className="text-sm">您当前处于静音状态，如需发言请举手申请</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
