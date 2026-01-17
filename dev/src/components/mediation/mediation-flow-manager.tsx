// src/components/mediation/mediation-flow-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Users, 
  MessageSquare, 
  FileText, 
  Calendar,
  ArrowRight,
  AlertTriangle,
  Play,
  Pause,
  Square,
  User
} from 'lucide-react';

interface MediationCase {
  id: string;
  title: string;
  applicant: string;
  respondent: string;
  mediator: string;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed';
  currentStage: 'preparation' | 'opening' | 'discussion' | 'negotiation' | 'agreement' | 'closure';
  createdAt: string;
  scheduledAt?: string;
  disputeType: string;
  disputeAmount: string;
}

interface FlowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  duration?: number; // 分钟
  notes?: string;
  completedAt?: string;
}

interface MediationFlowManagerProps {
  mediationCase: MediationCase;
  onStatusChange?: (status: MediationCase['status']) => void;
  onStageChange?: (stage: MediationCase['currentStage']) => void;
}

export function MediationFlowManager({ 
  mediationCase, 
  onStatusChange, 
  onStageChange 
}: MediationFlowManagerProps) {
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([
    {
      id: 'preparation',
      title: '调解准备',
      description: '确认参与方信息，准备调解材料',
      status: 'completed',
      duration: 15,
      completedAt: '2024-01-17 09:00'
    },
    {
      id: 'opening',
      title: '开场陈述',
      description: '调解员介绍规则，各方简要陈述',
      status: 'completed',
      duration: 20,
      completedAt: '2024-01-17 09:15'
    },
    {
      id: 'discussion',
      title: '问题讨论',
      description: '深入讨论争议焦点和各方观点',
      status: 'in_progress',
      duration: 45
    },
    {
      id: 'negotiation',
      title: '协商谈判',
      description: '寻找共同利益点，探讨解决方案',
      status: 'pending',
      duration: 60
    },
    {
      id: 'agreement',
      title: '达成协议',
      description: '确定最终协议条款',
      status: 'pending',
      duration: 30
    },
    {
      id: 'closure',
      title: '调解结束',
      description: '签署协议，完成调解程序',
      status: 'pending',
      duration: 15
    }
  ]);

  const [currentStepNotes, setCurrentStepNotes] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionStartTime && mediationCase.status === 'in_progress') {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000 / 60);
        setSessionDuration(duration);
      }, 60000); // 每分钟更新一次
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStartTime, mediationCase.status]);

  // 开始调解会话
  const startSession = () => {
    setSessionStartTime(new Date());
    if (onStatusChange) {
      onStatusChange('in_progress');
    }
  };

  // 暂停调解会话
  const pauseSession = () => {
    if (onStatusChange) {
      onStatusChange('paused');
    }
  };

  // 结束调解会话
  const endSession = (result: 'completed' | 'failed') => {
    setSessionStartTime(null);
    if (onStatusChange) {
      onStatusChange(result);
    }
  };

  // 完成当前步骤
  const completeCurrentStep = () => {
    const currentStepIndex = flowSteps.findIndex(step => step.status === 'in_progress');
    if (currentStepIndex === -1) return;

    const updatedSteps = [...flowSteps];
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      status: 'completed',
      notes: currentStepNotes,
      completedAt: new Date().toLocaleString('zh-CN')
    };

    // 开始下一步
    if (currentStepIndex < updatedSteps.length - 1) {
      updatedSteps[currentStepIndex + 1].status = 'in_progress';
    }

    setFlowSteps(updatedSteps);
    setCurrentStepNotes('');

    // 更新阶段
    const nextStage = updatedSteps[currentStepIndex + 1]?.id as MediationCase['currentStage'];
    if (nextStage && onStageChange) {
      onStageChange(nextStage);
    }
  };

  // 跳过当前步骤
  const skipCurrentStep = () => {
    const currentStepIndex = flowSteps.findIndex(step => step.status === 'in_progress');
    if (currentStepIndex === -1) return;

    const updatedSteps = [...flowSteps];
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      status: 'skipped',
      notes: currentStepNotes || '已跳过此步骤'
    };

    // 开始下一步
    if (currentStepIndex < updatedSteps.length - 1) {
      updatedSteps[currentStepIndex + 1].status = 'in_progress';
    }

    setFlowSteps(updatedSteps);
    setCurrentStepNotes('');
  };

  const getStatusColor = (status: FlowStep['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'skipped': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status: FlowStep['status']) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'skipped': return '已跳过';
      default: return '待开始';
    }
  };

  const currentStep = flowSteps.find(step => step.status === 'in_progress');
  const completedSteps = flowSteps.filter(step => step.status === 'completed').length;
  const totalSteps = flowSteps.length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* 调解会话控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              调解会话控制
            </span>
            <Badge variant={
              mediationCase.status === 'in_progress' ? 'default' :
              mediationCase.status === 'paused' ? 'secondary' :
              mediationCase.status === 'completed' ? 'default' : 'outline'
            }>
              {mediationCase.status === 'in_progress' ? '进行中' :
               mediationCase.status === 'paused' ? '已暂停' :
               mediationCase.status === 'completed' ? '已完成' :
               mediationCase.status === 'failed' ? '调解失败' : '待开始'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">会话时长</p>
              <p className="text-2xl font-bold">{sessionDuration}分钟</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-gray-600">进度</p>
              <p className="text-2xl font-bold">{completedSteps}/{totalSteps}</p>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex gap-2">
            {mediationCase.status === 'pending' && (
              <Button onClick={startSession} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                开始调解
              </Button>
            )}
            
            {mediationCase.status === 'in_progress' && (
              <>
                <Button variant="outline" onClick={pauseSession}>
                  <Pause className="h-4 w-4 mr-2" />
                  暂停
                </Button>
                <Button variant="outline" onClick={() => endSession('failed')}>
                  <Square className="h-4 w-4 mr-2" />
                  终止
                </Button>
                <Button onClick={() => endSession('completed')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  完成调解
                </Button>
              </>
            )}
            
            {mediationCase.status === 'paused' && (
              <Button onClick={startSession} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                继续调解
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 调解流程步骤 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            调解流程
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {flowSteps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(step.status)}`} />
                  {index < flowSteps.length - 1 && (
                    <div className="w-px h-12 bg-gray-200 mt-2" />
                  )}
                </div>
                
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{step.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getStatusText(step.status)}
                      </Badge>
                      {step.duration && (
                        <span className="text-xs text-gray-500">
                          {step.duration}分钟
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                  
                  {step.notes && (
                    <div className="bg-gray-50 p-2 rounded text-sm">
                      <strong>备注：</strong>{step.notes}
                    </div>
                  )}
                  
                  {step.completedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      完成时间：{step.completedAt}
                    </p>
                  )}
                  
                  {step.status === 'in_progress' && (
                    <div className="mt-3 space-y-3">
                      <Textarea
                        placeholder="添加步骤备注..."
                        value={currentStepNotes}
                        onChange={(e) => setCurrentStepNotes(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={completeCurrentStep}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          完成此步骤
                        </Button>
                        <Button size="sm" variant="outline" onClick={skipCurrentStep}>
                          <ArrowRight className="h-4 w-4 mr-1" />
                          跳过
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 当前步骤提示 */}
      {currentStep && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            当前正在进行：<strong>{currentStep.title}</strong> - {currentStep.description}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
