// dev/src/components/ui/input-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface InputField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'email' | 'number';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}

interface InputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  title: string;
  description?: string;
  fields: InputField[];
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function InputDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  fields,
  submitText = '确定',
  cancelText = '取消',
  loading = false
}: InputDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initialValues: Record<string, string> = {};
    fields.forEach(field => {
      initialValues[field.name] = field.defaultValue || '';
    });
    return initialValues;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleValueChange = (name: string, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // 清除错误
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.required && !values[field.name]?.trim()) {
        newErrors[field.name] = `${field.label}不能为空`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(values);
      if (!loading) {
        onClose();
        // 重置表单
        const resetValues: Record<string, string> = {};
        fields.forEach(field => {
          resetValues[field.name] = field.defaultValue || '';
        });
        setValues(resetValues);
        setErrors({});
      }
    }
  };

  const handleClose = () => {
    onClose();
    // 重置表单
    const resetValues: Record<string, string> = {};
    fields.forEach(field => {
      resetValues[field.name] = field.defaultValue || '';
    });
    setValues(resetValues);
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-gray-600 mt-2">{description}</p>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={values[field.name] || ''}
                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                  disabled={loading}
                  className={errors[field.name] ? 'border-red-500' : ''}
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={values[field.name] || ''}
                  onChange={(e) => handleValueChange(field.name, e.target.value)}
                  disabled={loading}
                  className={errors[field.name] ? 'border-red-500' : ''}
                />
              )}
              
              {errors[field.name] && (
                <p className="text-sm text-red-500">{errors[field.name]}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '处理中...' : submitText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage
export function useInputDialog() {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    fields: InputField[];
    onSubmit: (values: Record<string, string>) => void;
    submitText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    fields: [],
    onSubmit: () => {}
  });

  const showInputDialog = (options: {
    title: string;
    description?: string;
    fields: InputField[];
    onSubmit: (values: Record<string, string>) => void;
    submitText?: string;
    cancelText?: string;
  }) => {
    setDialog({
      isOpen: true,
      submitText: '确定',
      cancelText: '取消',
      ...options
    });
  };

  const hideInputDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const InputDialogComponent = () => (
    <InputDialog
      isOpen={dialog.isOpen}
      onClose={hideInputDialog}
      onSubmit={dialog.onSubmit}
      title={dialog.title}
      description={dialog.description}
      fields={dialog.fields}
      submitText={dialog.submitText}
      cancelText={dialog.cancelText}
    />
  );

  return {
    showInputDialog,
    hideInputDialog,
    InputDialog: InputDialogComponent
  };
}
