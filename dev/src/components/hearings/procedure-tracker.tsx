// dev/src/components/hearings/procedure-tracker.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  Clock,
  Play,
  Pause,
  SkipForward,
  FileText,
  Users,
  Scale,
  MessageSquare,
  Timer,
  AlertTriangle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface ProcedureStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // 分钟
  required: boolean;
  notes?: string;
  substeps?: ProcedureStep[];
}

interface ProcedureTrackerProps {
  hearingType: 'arbitration' | 'mediation';
  currentStep?: string;
  onStepChange?: (stepId: string) => void;
  onStepComplete?: (stepId: string, notes?: string) => void;
  isHost?: boolean;
  className?: string;
}

const arbitrationSteps: ProcedureStep[] = [
  {
    id: 'opening',
    title: '宣布开庭',
    description: '仲裁庭宣布开庭，介绍仲裁员和书记员',
    status: 'completed',
    required: true,
    startTime: new Date('2024-02-15T09:00:00'),
    endTime: new Date('2024-02-15T09:05:00'),
    duration: 5
  },
  {
    id: 'identity-verification',
    title: '身份核对',
    description: '核对当事人及代理人身份',
    status: 'completed',
    required: true,
    startTime: new Date('2024-02-15T09:05:00'),
    endTime: new Date('2024-02-15T09:10:00'),
    duration: 5
  },
  {
    id: 'procedure-explanation',
    title: '程序说明',
    description: '说明仲裁程序和注意事项',
    status: 'completed',
    required: true,
    startTime: new Date('2024-02-15T09:10:00'),
    endTime: new Date('2024-02-15T09:15:00'),
    duration: 5
  },
  {
    id: 'investigation',
    title: '调查与质证',
    description: '当事人举证、质证，仲裁庭调查事实',
    status: 'in-progress',
    required: true,
    startTime: new Date('2024-02-15T09:15:00'),
    duration: 60,
    substeps: [
      {
        id: 'applicant-evidence',
        title: '申请人举证',
        description: '申请人提交证据并说明',
        status: 'completed',
        required: true,
        duration: 20
      },
      {
        id: 'respondent-evidence',
        title: '被申请人举证',
        description: '被申请人提交证据并说明',
        status: 'in-progress',
        required: true,
        duration: 20
      },
      {
        id: 'cross-examination',
        title: '交叉质证',
        description: '双方对证据进行质证',
        status: 'pending',
        required: true,
        duration: 20
      }
    ]
  },
  {
    id: 'debate',
    title: '辩论阶段',
    description: '当事人进行辩论',
    status: 'pending',
    required: true,
    duration: 30
  },
  {
    id: 'final-statement',
    title: '最后陈述',
    description: '当事人作最后陈述',
    status: 'pending',
    required: true,
    duration: 15
  },
  {
    id: 'closing',
    title: '宣布闭庭',
    description: '仲裁庭宣布闭庭',
    status: 'pending',
    required: true,
    duration: 5
  }
];

const mediationSteps: ProcedureStep[] = [
  {
    id: 'opening',
    title: '调解开始',
    description: '调解员介绍调解程序和规则',
    status: 'completed',
    required: true,
    startTime: new Date('2024-02-15T09:00:00'),
    endTime: new Date('2024-02-15T09:10:00'),
    duration: 10
  },
  {
    id: 'dispute-statement',
    title: '争议陈述',
    description: '各方陈述争议焦点和诉求',
    status: 'in-progress',
    required: true,
    startTime: new Date('2024-02-15T09:10:00'),
    duration: 30,
    substeps: [
      {
        id: 'applicant-statement',
        title: '申请人陈述',
        description: '申请人陈述争议情况和调解请求',
        status: 'completed',
        required: true,
        duration: 15
      },
      {
        id: 'respondent-statement',
        title: '被申请人陈述',
        description: '被申请人陈述意见和态度',
        status: 'in-progress',
        required: true,
        duration: 15
      }
    ]
  },
  {
    id: 'mediation-discussion',
    title: '调解协商',
    description: '在调解员主持下进行协商',
    status: 'pending',
    required: true,
    duration: 60
  },
  {
    id: 'agreement-drafting',
    title: '协议起草',
    description: '起草调解协议',
    status: 'pending',
    required: false,
    duration: 20
  },
  {
    id: 'agreement-signing',
    title: '协议签署',
    description: '各方签署调解协议',
    status: 'pending',
    required: false,
    duration: 10
  },
  {
    id: 'completion',
    title: '调解结束',
    description: '调解程序正式结束',
    status: 'pending',
    required: true,
    duration: 5
  }
];

export function ProcedureTracker({ 
  hearingType, 
  currentStep, 
  onStepChange, 
  onStepComplete,
  isHost = false,
  className 
}: ProcedureTrackerProps) {
  const [steps, setSteps] = useState<ProcedureStep[]>(
    hearingType === 'arbitration' ? arbitrationSteps : mediationSteps
  );
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string>('');
  const [stepNote, setStepNote] = useState('');

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  const currentStepData = steps.find(step => step.status === 'in-progress');

  const handleStepAction = (stepId: string, action: 'start' | 'complete' | 'skip') => {
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
          default:
            return step;
        }
      }
      return step;
    }));

    onStepChange?.(stepId);
    if (action === 'complete') {
      onStepComplete?.(stepId);
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

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getStepIcon = (step: ProcedureStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepColor = (step: ProcedureStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      case 'skipped':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getStatusBadge = (status: ProcedureStep['status']) => {
    const badges = {
      pending: <Badge variant="outline" className="text-gray-600">待开始</Badge>,
      'in-progress': <Badge className="bg-blue-100 text-blue-800">进行中</Badge>,
      completed: <Badge className="bg-green-100 text-green-800">已完成</Badge>,
      skipped: <Badge variant="outline" className="text-gray-500">已跳过</Badge>
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

  const getElapsedTime = (startTime?: Date) => {
    if (!startTime) return '';
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 60000);
    return formatDuration(elapsed);
  };

  return (
    <Card className={`${className} max-h-[600px] overflow-y-auto`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {hearingType === 'arbitration' ? (
              <Scale className="h-4 w-4" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {hearingType === 'arbitration' ? '仲裁程序' : '调解程序'}
          </div>
          <div className="text-sm text-gray-500">
            {completedSteps}/{totalSteps}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 进度条 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>整体进度</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* 当前步骤提示 */}
        {currentStepData && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">当前：{currentStepData.title}</span>
            </div>
            <div className="text-sm text-blue-700">
              {currentStepData.description}
            </div>
            {currentStepData.startTime && (
              <div className="text-xs text-blue-600 mt-1">
                已进行：{getElapsedTime(currentStepData.startTime)}
              </div>
            )}
          </div>
        )}

        {/* 步骤列表 */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.id} className={`border rounded-lg ${getStepColor(step)}`}>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                      {getStepIcon(step)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{step.title}</span>
                        {step.required && (
                          <Badge variant="outline" className="text-xs">必需</Badge>
                        )}
                        {getStatusBadge(step.status)}
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        {step.duration && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            预计{formatDuration(step.duration)}
                          </span>
                        )}
                        {step.startTime && (
                          <span>开始：{step.startTime.toLocaleTimeString()}</span>
                        )}
                        {step.endTime && (
                          <span>结束：{step.endTime.toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {step.substeps && step.substeps.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStepExpansion(step.id)}
                      >
                        {expandedSteps.has(step.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    
                    {isHost && (
                      <>
                        {step.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStepAction(step.id, 'start')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            开始
                          </Button>
                        )}
                        
                        {step.status === 'in-progress' && (
                          <Button
                            size="sm"
                            onClick={() => handleStepAction(step.id, 'complete')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            完成
                          </Button>
                        )}
                      </>
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
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {step.notes && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>备注：</strong>{step.notes}
                  </div>
                )}
              </div>

              {/* 子步骤 */}
              {step.substeps && expandedSteps.has(step.id) && (
                <div className="border-t border-gray-200 bg-gray-50 p-3">
                  <div className="space-y-2">
                    {step.substeps.map((substep) => (
                      <div key={substep.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center gap-2">
                          {getStepIcon(substep)}
                          <span className="text-sm font-medium">{substep.title}</span>
                          {getStatusBadge(substep.status)}
                        </div>
                        {substep.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(substep.duration)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>

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
                保存备注
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
