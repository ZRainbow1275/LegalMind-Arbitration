import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { WorkflowTemplate } from '../stores/workspaceStore';

interface SaveTemplateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (templateData: Omit<WorkflowTemplate, 'id'>) => void;
    initialData?: WorkflowTemplate;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<WorkflowTemplate['category']>('custom');
    const [tags, setTags] = useState('');
    const [estimatedDuration, setEstimatedDuration] = useState('30');
    const [complexity, setComplexity] = useState<WorkflowTemplate['complexity']>('medium');

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
            setDescription(initialData?.description || '');
            setCategory(initialData?.category || 'custom');
            setTags(initialData?.tags.join(', ') || '');
            setEstimatedDuration(initialData?.estimatedDuration?.toString() || '30');
            setComplexity(initialData?.complexity || 'medium');
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        if (!name) return;

        onSave({
            name,
            description,
            category,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            estimatedDuration: parseInt(estimatedDuration) || 0,
            complexity,
            nodes: initialData?.nodes || [],
            connections: initialData?.connections || []
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? '编辑模板' : '保存为模板'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            名称
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="输入模板名称"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            描述
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            placeholder="输入模板描述"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            分类
                        </Label>
                        <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="custom">自定义</SelectItem>
                                <SelectItem value="arbitration">商事仲裁</SelectItem>
                                <SelectItem value="litigation">诉讼</SelectItem>
                                <SelectItem value="contract">合同纠纷</SelectItem>
                                <SelectItem value="ip">知识产权</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="complexity" className="text-right">
                            复杂度
                        </Label>
                        <Select value={complexity} onValueChange={(v: any) => setComplexity(v)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="选择复杂度" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="simple">简单</SelectItem>
                                <SelectItem value="medium">中等</SelectItem>
                                <SelectItem value="complex">复杂</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                            预计天数
                        </Label>
                        <Input
                            id="duration"
                            type="number"
                            value={estimatedDuration}
                            onChange={(e) => setEstimatedDuration(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tags" className="text-right">
                            标签
                        </Label>
                        <Input
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="col-span-3"
                            placeholder="标签之间用逗号分隔"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>取消</Button>
                    <Button onClick={handleSave} disabled={!name}>保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
