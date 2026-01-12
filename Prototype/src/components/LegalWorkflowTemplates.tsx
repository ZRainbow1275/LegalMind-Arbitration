import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Users, Gavel, Shield, Briefcase, LayoutTemplate, Edit, Trash2 } from 'lucide-react';
import { useWorkspaceStore, WorkflowTemplate } from '../stores/workspaceStore';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { useState } from 'react';

// Map category to icon
const getCategoryIcon = (category: WorkflowTemplate['category']) => {
    switch (category) {
        case 'contract': return FileText;
        case 'arbitration': return Gavel;
        case 'ip': return Shield;
        case 'litigation': return Users;
        default: return Briefcase;
    }
};

interface LegalWorkflowTemplatesProps {
    onSelectTemplate: (template: WorkflowTemplate) => void;
    onClose?: () => void;
}

export const LegalWorkflowTemplates: React.FC<LegalWorkflowTemplatesProps> = ({
    onSelectTemplate,
    onClose
}) => {
    const templates = useWorkspaceStore(state => state.templates);
    const deleteTemplate = useWorkspaceStore(state => state.deleteTemplate);
    const updateTemplate = useWorkspaceStore(state => state.updateTemplate);
    const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);

    const handleEditSave = (data: Omit<WorkflowTemplate, 'id'>) => {
        if (editingTemplate) {
            updateTemplate(editingTemplate.id, data);
            setEditingTemplate(null);
        }
    };

    return (
        <Card className="w-full h-full border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <LayoutTemplate className="w-5 h-5 text-orange-500" />
                    案件模板库
                </CardTitle>
                <p className="text-sm text-gray-500">
                    选择一个模板快速初始化案件结构，提高工作效率。
                </p>
            </CardHeader>
            <CardContent className="px-0">
                <ScrollArea className="h-[400px] pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.map((template) => {
                            const Icon = getCategoryIcon(template.category);
                            return (
                                <div
                                    key={template.id}
                                    className="group relative p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:shadow-md transition-all duration-200 cursor-pointer"
                                    onClick={() => {
                                        onSelectTemplate(template);
                                        onClose?.();
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                            <Icon className="w-6 h-6 text-orange-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 mb-1 group-hover:text-orange-600 transition-colors">
                                                {template.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                                {template.description}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {template.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        {template.category === 'custom' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 w-7 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingTemplate(template);
                                                    }}
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('确定要删除这个模板吗？')) {
                                                            deleteTemplate(template.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </>
                                        )}
                                        <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600">
                                            使用模板
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>

            {/* Edit Template Dialog */}
            <SaveTemplateDialog
                isOpen={!!editingTemplate}
                onClose={() => setEditingTemplate(null)}
                onSave={handleEditSave}
                initialData={editingTemplate || undefined}
            />
        </Card>
    );
};
