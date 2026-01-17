// dev/src/lib/hooks/use-case-progress-automation.ts

import { useEffect, useCallback } from 'react';
import { useCaseProgressStore } from '@/store/case-progress';
import { useCasesStore } from '@/store';
import { CaseStatus } from '@/types';

// 案件状态到进展阶段的映射
const statusToStageMap: Record<CaseStatus, string> = {
  'draft': '草稿准备',
  'submitted': '申请提交',
  'accepted': '材料审核',
  'payment_pending': '费用缴纳',
  'tribunal_formation': '仲裁庭组成',
  'pre_hearing': '庭前准备',
  'hearing_scheduled': '庭审安排',
  'hearing_in_progress': '庭审进行',
  'deliberation': '合议评议',
  'award_issued': '裁决书制作',
  'completed': '案件结案',
  'terminated': '案件终止'
};

// 案件状态到进度百分比的映射
const statusToProgressMap: Record<CaseStatus, number> = {
  'draft': 5,
  'submitted': 15,
  'accepted': 25,
  'payment_pending': 35,
  'tribunal_formation': 45,
  'pre_hearing': 55,
  'hearing_scheduled': 65,
  'hearing_in_progress': 75,
  'deliberation': 85,
  'award_issued': 95,
  'completed': 100,
  'terminated': 0
};

  type MilestoneTemplate = {
    title: string;
    description: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    dependencies: string[];
  };

  // 预定义的里程碑模板
  const milestoneTemplates: Partial<Record<CaseStatus, MilestoneTemplate[]>> = {
    submitted: [
      {
        title: '提交仲裁申请',
        description: '申请人提交仲裁申请书及相关材料',
        importance: 'high' as const,
        dependencies: []
      }
    ],
    accepted: [
      {
        title: '材料审核完成',
        description: '仲裁机构审核申请材料，确认受理',
        importance: 'high' as const,
        dependencies: []
      }
    ],
    payment_pending: [
      {
        title: '缴纳仲裁费用',
        description: '申请人缴纳仲裁费用',
        importance: 'critical' as const,
        dependencies: []
      }
    ],
    tribunal_formation: [
      {
        title: '仲裁庭组成',
        description: '确定仲裁员，组成仲裁庭',
        importance: 'high' as const,
        dependencies: []
      }
    ],
    pre_hearing: [
      {
        title: '庭前准备',
        description: '整理案件材料，准备庭审',
        importance: 'medium' as const,
        dependencies: []
      }
    ],
    hearing_scheduled: [
      {
        title: '庭审安排',
        description: '确定庭审时间和地点',
        importance: 'high' as const,
        dependencies: []
      }
    ],
    hearing_in_progress: [
      {
        title: '庭审进行',
        description: '正在进行庭审程序',
        importance: 'critical' as const,
        dependencies: []
      }
    ],
    deliberation: [
      {
        title: '合议评议',
        description: '仲裁庭合议案件',
        importance: 'high' as const,
        dependencies: []
      }
    ],
    award_issued: [
      {
        title: '裁决书制作',
        description: '制作并发出仲裁裁决书',
        importance: 'critical' as const,
        dependencies: []
      }
    ],
    completed: [
      {
        title: '案件结案',
        description: '案件审理完毕，正式结案',
        importance: 'high' as const,
        dependencies: []
      }
  ]
};

export function useCaseProgressAutomation(caseId: string) {
  const {
    getProgress,
    setProgress,
    updateProgress,
    addMilestone,
    completeMilestone,
    addTimelineEvent,
    updateProgressPercentage
  } = useCaseProgressStore();
  
  const { cases, updateCase } = useCasesStore();
  const currentCase = cases.find(c => c.id === caseId);

  // 初始化案件进展
  const initializeProgress = useCallback((caseId: string, status: CaseStatus) => {
    const existingProgress = getProgress(caseId);
    if (!existingProgress) {
      const stage = statusToStageMap[status];
      const progressPercentage = statusToProgressMap[status];
      
      setProgress(caseId, {
        stage,
        status: status === 'completed' ? 'completed' : 'in-progress',
        progress: progressPercentage,
        milestones: [],
        timeline: [],
        nextActions: [],
        blockers: [],
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      });

      // 添加初始时间线事件
      addTimelineEvent(caseId, {
        date: new Date().toISOString().split('T')[0],
        title: '案件进展初始化',
        description: `案件当前状态：${stage}`,
        type: 'other',
        status: 'completed',
        participants: ['系统'],
        documents: [],
        impact: 'medium'
      });
    }
  }, [getProgress, setProgress, addTimelineEvent]);

  // 更新案件进展
  const updateCaseProgress = useCallback((caseId: string, newStatus: CaseStatus, oldStatus?: CaseStatus) => {
    const stage = statusToStageMap[newStatus];
    const progressPercentage = statusToProgressMap[newStatus];
    
    // 更新进展状态
    updateProgress(caseId, {
      stage,
      status: newStatus === 'completed' || newStatus === 'terminated' ? 'completed' : 'in-progress',
      progress: progressPercentage,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    });

    // 如果有旧状态的里程碑，标记为完成
    if (oldStatus && milestoneTemplates[oldStatus]) {
      const progress = getProgress(caseId);
      if (progress) {
        progress.milestones.forEach(milestone => {
          if (milestone.status === 'pending') {
            completeMilestone(caseId, milestone.id);
          }
        });
      }
    }

    // 添加新状态的里程碑
    if (milestoneTemplates[newStatus]) {
      milestoneTemplates[newStatus].forEach(template => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // 默认7天后到期
        
        addMilestone(caseId, {
          ...template,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'pending'
        });
      });
    }

    // 添加时间线事件
    addTimelineEvent(caseId, {
      date: new Date().toISOString().split('T')[0],
      title: `案件状态更新`,
      description: `案件状态从"${oldStatus ? statusToStageMap[oldStatus] : '未知'}"更新为"${stage}"`,
      type: 'other',
      status: 'completed',
      participants: ['系统'],
      documents: [],
      impact: 'high'
    });

    // 重新计算进度百分比
    updateProgressPercentage(caseId);
  }, [updateProgress, getProgress, completeMilestone, addMilestone, addTimelineEvent, updateProgressPercentage]);

  // 手动完成任务
  const completeTask = useCallback((taskTitle: string, description?: string) => {
    const progress = getProgress(caseId);
    if (!progress) return;

    // 查找对应的里程碑
    const milestone = progress.milestones.find(m => 
      m.title.includes(taskTitle) && m.status === 'pending'
    );

    if (milestone) {
      completeMilestone(caseId, milestone.id);
      
      // 添加时间线事件
      addTimelineEvent(caseId, {
        date: new Date().toISOString().split('T')[0],
        title: `任务完成：${taskTitle}`,
        description: description || `已完成任务：${milestone.description}`,
        type: 'milestone',
        status: 'completed',
        participants: ['用户'],
        documents: [],
        impact: 'medium'
      });

      // 重新计算进度
      updateProgressPercentage(caseId);
    }
  }, [caseId, getProgress, completeMilestone, addTimelineEvent, updateProgressPercentage]);

  // 添加自定义里程碑
  const addCustomMilestone = useCallback((title: string, description: string, dueDate: string, importance: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    addMilestone(caseId, {
      title,
      description,
      dueDate,
      status: 'pending',
      importance,
      dependencies: []
    });

    // 添加时间线事件
    addTimelineEvent(caseId, {
      date: new Date().toISOString().split('T')[0],
      title: `新增里程碑：${title}`,
      description: `添加了新的里程碑：${description}`,
      type: 'milestone',
      status: 'completed',
      participants: ['用户'],
      documents: [],
      impact: 'medium'
    });
  }, [caseId, addMilestone, addTimelineEvent]);

  // 监听案件状态变化
  useEffect(() => {
    if (!currentCase) return;

    const progress = getProgress(caseId);
    
    // 如果没有进展记录，初始化
    if (!progress) {
      initializeProgress(caseId, currentCase.status);
      return;
    }

    // 检查状态是否发生变化
    const currentStage = statusToStageMap[currentCase.status];
    if (progress.stage !== currentStage) {
      // 找到旧状态
      const oldStatus = Object.entries(statusToStageMap).find(
        ([_, stage]) => stage === progress.stage
      )?.[0] as CaseStatus;
      
      updateCaseProgress(caseId, currentCase.status, oldStatus);
    }
  }, [currentCase?.status, caseId, getProgress, initializeProgress, updateCaseProgress]);

  return {
    progress: getProgress(caseId),
    completeTask,
    addCustomMilestone,
    updateCaseProgress,
    initializeProgress
  };
}
