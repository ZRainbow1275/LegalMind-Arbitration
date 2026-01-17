// dev/src/components/cases/case-progress-manager.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCaseProgressStore, type Blocker, type Milestone, type NextAction } from '@/store/case-progress';
import { 
  Plus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  TrendingUp,
  Users,
  FileText,
  Flag,
  Edit,
  Trash2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface CaseProgressManagerProps {
  caseId: string;
}

type MilestoneFormData = Pick<Milestone, 'title' | 'description' | 'dueDate' | 'importance'>;
type ActionFormData = Pick<NextAction, 'title' | 'description' | 'assignee' | 'dueDate' | 'priority'>;
type BlockerFormData = Pick<Blocker, 'title' | 'description' | 'type' | 'severity' | 'impact'>;

const isMilestoneImportance = (value: string): value is MilestoneFormData['importance'] => {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical';
};

export function CaseProgressManager({ caseId }: CaseProgressManagerProps) {     
  const {
    getProgress,
    setProgress,
    updateProgress,
    addMilestone,
    updateMilestone,
    completeMilestone,
    addNextAction,
    completeNextAction,
    addBlocker,
    resolveBlocker,
    calculateProgress
  } = useCaseProgressStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);

  const progress = getProgress(caseId);

  // 如果没有进展记录，创建一个
  if (!progress) {
    setProgress(caseId, {
      stage: '案件受理',
      status: 'in-progress',
      progress: 0
    });
    return <div>正在初始化案件进展...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddMilestone = (data: MilestoneFormData) => {
    addMilestone(caseId, {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      status: 'pending',
      importance: data.importance,
      dependencies: []
    });
    setShowMilestoneDialog(false);
  };

  const handleAddAction = (data: ActionFormData) => {
    addNextAction(caseId, {
      title: data.title,
      description: data.description,
      assignee: data.assignee,
      dueDate: data.dueDate,
      priority: data.priority,
      status: 'pending',
      dependencies: []
    });
    setShowActionDialog(false);
  };

  const handleAddBlocker = (data: BlockerFormData) => {
    addBlocker(caseId, {
      title: data.title,
      description: data.description,
      type: data.type,
      severity: data.severity,
      reportedDate: new Date().toISOString(),
      reportedBy: '当前用户',
      impact: data.impact
    });
    setShowBlockerDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              案件进展概览
            </div>
            <Badge className={getStatusColor(progress.status)}>
              {progress.status === 'in-progress' ? '进行中' : 
               progress.status === 'completed' ? '已完成' :
               progress.status === 'pending' ? '待处理' :
               progress.status === 'blocked' ? '受阻' : '已取消'}
            </Badge>
          </CardTitle>
          <CardDescription>
            当前阶段：{progress.stage} · 最后更新：{new Date(progress.lastUpdated).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">整体进度</span>
                <span className="text-sm text-gray-500">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.milestones.length}</div>
                <div className="text-xs text-gray-500">里程碑</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progress.nextActions.length}</div>
                <div className="text-xs text-gray-500">待办事项</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{progress.timeline.length}</div>
                <div className="text-xs text-gray-500">时间线事件</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{progress.blockers.filter(b => !b.resolvedDate).length}</div>
                <div className="text-xs text-gray-500">活跃阻碍</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细管理标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="milestones">里程碑</TabsTrigger>
          <TabsTrigger value="actions">待办事项</TabsTrigger>
          <TabsTrigger value="blockers">阻碍管理</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  即将到期的里程碑
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {progress.milestones
                    .filter(m => m.status === 'pending')
                    .slice(0, 3)
                    .map(milestone => (
                      <div key={milestone.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{milestone.title}</p>
                          <p className="text-xs text-gray-500">{milestone.dueDate}</p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => completeMilestone(caseId, milestone.id)}
                        >
                          完成
                        </Button>
                      </div>
                    ))}
                  {progress.milestones.filter(m => m.status === 'pending').length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">暂无待完成的里程碑</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  紧急待办事项
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {progress.nextActions
                    .filter(a => a.status === 'pending' && (a.priority === 'high' || a.priority === 'urgent'))
                    .slice(0, 3)
                    .map(action => (
                      <div key={action.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{action.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(action.priority)}>
                              {action.priority === 'urgent' ? '紧急' : '高'}
                            </Badge>
                            <span className="text-xs text-gray-500">{action.dueDate}</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => completeNextAction(caseId, action.id)}
                        >
                          完成
                        </Button>
                      </div>
                    ))}
                  {progress.nextActions.filter(a => a.status === 'pending' && (a.priority === 'high' || a.priority === 'urgent')).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">暂无紧急待办事项</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 里程碑标签页 */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">里程碑管理</h3>
            <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加里程碑
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>添加新里程碑</DialogTitle>
                  <DialogDescription>
                    设置案件进展的重要节点
                  </DialogDescription>
                </DialogHeader>
                <MilestoneForm onSubmit={handleAddMilestone} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {progress.milestones.map(milestone => (
              <Card key={milestone.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{milestone.title}</h4>
                        <Badge className={getStatusColor(milestone.status)}>
                          {milestone.status === 'completed' ? '已完成' : 
                           milestone.status === 'pending' ? '待完成' : '逾期'}
                        </Badge>
                        <Badge variant="outline">
                          {milestone.importance === 'critical' ? '关键' :
                           milestone.importance === 'high' ? '重要' :
                           milestone.importance === 'medium' ? '一般' : '低'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>截止日期：{milestone.dueDate}</span>
                        {milestone.completedDate && (
                          <span>完成日期：{milestone.completedDate}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {milestone.status === 'pending' && (
                        <Button 
                          size="sm" 
                          onClick={() => completeMilestone(caseId, milestone.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 其他标签页内容可以继续添加 */}
      </Tabs>
    </div>
  );
}

// 里程碑表单组件
function MilestoneForm({ onSubmit }: { onSubmit: (data: MilestoneFormData) => void }) {
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: '',
    description: '',
    dueDate: '',
    importance: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: '', description: '', dueDate: '', importance: 'medium' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="milestone-title">标题</Label>
        <Input
          id="milestone-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="输入里程碑标题"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="milestone-description">描述</Label>
        <Textarea
          id="milestone-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="详细描述这个里程碑..."
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="milestone-date">截止日期</Label>
          <Input
            id="milestone-date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="milestone-importance">重要程度</Label>
          <Select value={formData.importance} onValueChange={(value) => {
            if (!isMilestoneImportance(value)) return;
            setFormData(prev => ({ ...prev, importance: value }));
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="medium">一般</SelectItem>
              <SelectItem value="high">重要</SelectItem>
              <SelectItem value="critical">关键</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">添加里程碑</Button>
      </DialogFooter>
    </form>
  );
}
