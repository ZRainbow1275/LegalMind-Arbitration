// dev/src/components/mediation/mediation-process.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  FileText,
  Users,
  MessageSquare,
  Calendar,
  Target,
  Handshake,
  Scale,
  Send
} from 'lucide-react';

interface MediationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // 分钟
  required: boolean;
  notes?: string;
}

interface MediationProcessProps {
  mediationId: string;
  currentStep?: string;
  onStepChange?: (stepId: string) => void;
  onProcessComplete?: () => void;
  className?: string;
}

const defaultSteps: MediationStep[] = [
  {
    id: 'preparation',
    title: '调解准备',
    description: '确认参与方信息，准备调解材料',
    status: 'completed',
    required: true,
    startTime: new Date('2024-01-15T09:00:00'),
    endTime: new Date('2024-01-15T09:30:00'),
    duration: 30
  },
  {
    id: 'opening',
    title: '调解开始',
    description: '调解员介绍调解程序和规则',
    status: 'completed',
    required: true,
    startTime: new Date('2024-01-15T09:30:00'),
    endTime: new Date('2024-01-15T09:45:00'),
    duration: 15
  },
  {
    id: 'statement',
    title: '争议陈述',
    description: '各方陈述争议焦点和诉求',
    status: 'in-progress',
    required: true,
    startTime: new Date('2024-01-15T09:45:00'),
    duration: 45
  },
  {
    id: 'discussion',
    title: '协商讨论',
    description: '在调解员主持下进行协商',
    status: 'pending',
    required: true,
    duration: 60
  },
  {
    id: 'agreement',
    title: '达成协议',
    description: '起草和确认调解协议',
    status: 'pending',
    required: false,
    duration: 30
  },
  {
    id: 'signing',
    title: '签署协议',
    description: '各方签署调解协议',
    status: 'pending',
    required: false,
    duration: 15
  },
  {
    id: 'completion',
    title: '调解完成',
    description: '调解程序正式结束',
    status: 'pending',
    required: true,
    duration: 10
  }
];

export function MediationProcess({ 
  mediationId, 
  currentStep, 
  onStepChange, 
  onProcessComplete,
  className 
}: MediationProcessProps) {
  const [steps, setSteps] = useState<MediationStep[]>(defaultSteps);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [stepNote, setStepNote] = useState('');

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  const currentStepData = steps.find(step => step.status === 'in-progress');
  const nextStep = steps.find(step => step.status === 'pending');

  const handleStepAction = (stepId: string, action: 'start' | 'complete' | 'skip' | 'restart') => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        switch (action) {
          case 'start':
            return {
              ...step,
              status: 'in-progress' as const,
              startTime: new Date()
            };
          case 'complete':
            return {
              ...step,
              status: 'completed' as const,
              endTime: new Date()
            };
          case 'skip':
            return {
              ...step,
              status: 'skipped' as const
            };
          case 'restart':
            return {
              ...step,
              status: 'pending' as const,
              startTime: undefined,
              endTime: undefined
            };
          default:
            return step;
        }
      }
      return step;
    }));

    onStepChange?.(stepId);

    // 检查是否所有必需步骤都已完成
    const updatedSteps = steps.map(step => {
      if (step.id === stepId && action === 'complete') {
        return { ...step, status: 'completed' as const };
      }
      return step;
    });

    const allRequiredCompleted = updatedSteps
      .filter(step => step.required)
      .every(step => step.status === 'completed' || step.status === 'skipped');

    if (allRequiredCompleted) {
      onProcessComplete?.();
    }
  };

  const handleAddNote = () => {
    if (!selectedStep || !stepNote.trim()) return;

    setSteps(prev => prev.map(step => 
      step.id === selectedStep 
        ? { ...step, notes: stepNote.trim() }
        : step
    ));

    setShowNoteDialog(false);
    setStepNote('');
    setSelectedStep('');
  };

  const getStepIcon = (step: MediationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepColor = (step: MediationStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'skipped':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getStatusBadge = (status: MediationStep['status']) => {
    const badges = {
      pending: <Badge variant="outline" className="text-gray-600">待开始</Badge>,
      'in-progress': <Badge className="bg-blue-100 text-blue-800">进行中</Badge>,
      completed: <Badge className="bg-green-100 text-green-800">已完成</Badge>,
      skipped: <Badge variant="outline" className="text-gray-500">已跳过</Badge>,
      failed: <Badge className="bg-red-100 text-red-800">失败</Badge>
    };
    return badges[status];
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 进度概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              调解进度
            </div>
            <div className="text-sm text-gray-500">
              {completedSteps}/{totalSteps} 步骤已完成
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>整体进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {currentStepData && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">当前步骤</span>
                </div>
                <div className="text-sm text-blue-700">
                  {currentStepData.title} - {currentStepData.description}
                </div>
                {currentStepData.startTime && (
                  <div className="text-xs text-blue-600 mt-1">
                    开始时间：{currentStepData.startTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 步骤列表 */}
      <Card>
        <CardHeader>
          <CardTitle>调解流程</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className={`border rounded-lg p-4 ${getStepColor(step)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getStepIcon(step)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-500">
                          步骤 {index + 1}
                        </span>
                        {step.required && (
                          <Badge variant="outline" className="text-xs">必需</Badge>
                        )}
                        {getStatusBadge(step.status)}
                      </div>
                      <h4 className="font-medium mb-1">{step.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {step.duration && (
                          <span>预计时长：{formatDuration(step.duration)}</span>
                        )}
                        {step.startTime && (
                          <span>开始：{step.startTime.toLocaleTimeString()}</span>
                        )}
                        {step.endTime && (
                          <span>结束：{step.endTime.toLocaleTimeString()}</span>
                        )}
                      </div>
                      
                      {step.notes && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <strong>备注：</strong>{step.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {step.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStepAction(step.id, 'start')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        开始
                      </Button>
                    )}
                    
                    {step.status === 'in-progress' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStepAction(step.id, 'complete')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          完成
                        </Button>
                        {!step.required && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStepAction(step.id, 'skip')}
                          >
                            <SkipForward className="h-4 w-4 mr-1" />
                            跳过
                          </Button>
                        )}
                      </>
                    )}
                    
                    {(step.status === 'completed' || step.status === 'skipped') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStepAction(step.id, 'restart')}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        重新开始
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStep(step.id);
                        setStepNote(step.notes || '');
                        setShowNoteDialog(true);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 添加备注对话框 */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加步骤备注</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="step-note">备注内容</Label>
              <Textarea
                id="step-note"
                value={stepNote}
                onChange={(e) => setStepNote(e.target.value)}
                placeholder="记录该步骤的重要信息、决定或注意事项..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                取消
              </Button>
              <Button onClick={handleAddNote}>
                <Send className="h-4 w-4 mr-2" />
                保存备注
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
