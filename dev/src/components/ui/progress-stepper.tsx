// src/components/ui/progress-stepper.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';

export interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  date?: string;
}

interface ProgressStepperProps {
  steps: ProgressStep[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showConnector?: boolean;
  className?: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    bgColor: 'bg-green-500',
    textColor: 'text-green-700',
    borderColor: 'border-green-500',
    connectorColor: 'bg-green-500'
  },
  current: {
    icon: Clock,
    bgColor: 'bg-gradient-to-r from-orange-500 to-orange-600',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-500',
    connectorColor: 'bg-orange-500'
  },
  pending: {
    icon: Circle,
    bgColor: 'bg-gray-300',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-300',
    connectorColor: 'bg-gray-300'
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-500',
    connectorColor: 'bg-red-500'
  }
};

const sizeConfig = {
  sm: {
    iconSize: 'w-6 h-6',
    iconContainer: 'w-8 h-8',
    titleSize: 'text-sm',
    descriptionSize: 'text-xs',
    spacing: 'space-y-2'
  },
  md: {
    iconSize: 'w-8 h-8',
    iconContainer: 'w-10 h-10',
    titleSize: 'text-base',
    descriptionSize: 'text-sm',
    spacing: 'space-y-3'
  },
  lg: {
    iconSize: 'w-10 h-10',
    iconContainer: 'w-12 h-12',
    titleSize: 'text-lg',
    descriptionSize: 'text-base',
    spacing: 'space-y-4'
  }
};

export function ProgressStepper({
  steps,
  orientation = 'horizontal',
  size = 'md',
  showConnector = true,
  className
}: ProgressStepperProps) {
  const sizeStyles = sizeConfig[size];

  const renderStep = (step: ProgressStep, index: number) => {
    const config = statusConfig[step.status];
    const Icon = config.icon;
    const isCompleted = step.status === 'completed';
    const isCurrent = step.status === 'current';
    const isError = step.status === 'error';

    return (
      <div
        key={step.id}
        className={cn(
          'flex items-center',
          orientation === 'vertical' ? 'flex-col text-center' : 'flex-row',
          sizeStyles.spacing
        )}
      >
        {/* Step Icon */}
        <div className="relative">
          <div
            className={cn(
              'rounded-full flex items-center justify-center transition-all duration-300',
              sizeStyles.iconContainer,
              config.bgColor,
              isCurrent && 'shadow-brand animate-pulse',
              isError && 'animate-bounce'
            )}
          >
            {isCompleted ? (
              <CheckCircle className={cn(sizeStyles.iconSize, 'text-white')} />
            ) : (
              <Icon className={cn(sizeStyles.iconSize, 'text-white')} />
            )}
          </div>
          
          {/* Step Number for pending states */}
          {step.status === 'pending' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-medium text-sm">{index + 1}</span>
            </div>
          )}
        </div>

        {/* Step Content */}
        <div className={cn(
          'flex-1',
          orientation === 'horizontal' ? 'ml-4' : 'mt-2'
        )}>
          <h3 className={cn(
            'font-semibold transition-colors',
            sizeStyles.titleSize,
            config.textColor
          )}>
            {step.title}
          </h3>
          
          {step.description && (
            <p className={cn(
              'text-gray-600 mt-1',
              sizeStyles.descriptionSize
            )}>
              {step.description}
            </p>
          )}
          
          {step.date && (
            <p className="text-xs text-gray-500 mt-1">
              {step.date}
            </p>
          )}
        </div>

        {/* Connector */}
        {showConnector && index < steps.length - 1 && (
          <div className={cn(
            'transition-all duration-500',
            orientation === 'horizontal' 
              ? 'flex-1 h-0.5 mx-4' 
              : 'w-0.5 h-8 my-2',
            step.status === 'completed' || step.status === 'current'
              ? config.connectorColor
              : 'bg-gray-300'
          )} />
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'w-full',
      orientation === 'horizontal' 
        ? 'flex items-center' 
        : 'flex flex-col',
      className
    )}>
      {steps.map((step, index) => renderStep(step, index))}
    </div>
  );
}

// 简化的进度条组件
interface SimpleProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function SimpleProgress({
  value,
  max = 100,
  size = 'md',
  showLabel = true,
  label,
  className
}: SimpleProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const heightConfig = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || '进度'}
          </span>
          <span className="text-sm text-gray-600">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        heightConfig[size]
      )}>
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500 ease-out progress-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// 案件状态进度条
interface CaseProgressProps {
  currentStage: string;
  stages?: string[];
  className?: string;
}

const defaultStages = [
  '申请提交',
  '材料审核',
  '仲裁庭组成',
  '庭审进行',
  '裁决书制作',
  '案件结案'
];

export function CaseProgress({
  currentStage,
  stages = defaultStages,
  className
}: CaseProgressProps) {
  const currentIndex = stages.indexOf(currentStage);
  
  const steps: ProgressStep[] = stages.map((stage, index) => ({
    id: `stage-${index}`,
    title: stage,
    status: index < currentIndex 
      ? 'completed' 
      : index === currentIndex 
        ? 'current' 
        : 'pending'
  }));

  return (
    <div className={cn('w-full', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">案件进度</h3>
      <ProgressStepper 
        steps={steps} 
        orientation="horizontal"
        size="md"
      />
    </div>
  );
}
