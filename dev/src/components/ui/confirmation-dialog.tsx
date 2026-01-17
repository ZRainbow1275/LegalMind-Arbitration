// dev/src/components/ui/confirmation-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    confirmVariant: 'default' as const
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmVariant: 'default' as const
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    confirmVariant: 'destructive' as const
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    confirmVariant: 'default' as const
  }
};

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = '确定',
  cancelText = '取消',
  loading = false
}: ConfirmationDialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600 whitespace-pre-line">{message}</p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage
export function useConfirmationDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  });

  const showConfirmation = (options: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => {
    setDialog({
      isOpen: true,
      type: 'info',
      confirmText: '确定',
      cancelText: '取消',
      ...options
    });
  };

  const hideConfirmation = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmationDialogComponent = () => (
    <ConfirmationDialog
      isOpen={dialog.isOpen}
      onClose={hideConfirmation}
      onConfirm={dialog.onConfirm}
      title={dialog.title}
      message={dialog.message}
      type={dialog.type}
      confirmText={dialog.confirmText}
      cancelText={dialog.cancelText}
    />
  );

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationDialog: ConfirmationDialogComponent
  };
}
