import React from 'react';
import {
    Calendar,
    AlertCircle,
    CheckCircle,
    HelpCircle,
    FileText,
    Mic,
    Box,
    Cpu,
    Link as LinkIcon
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { TimelineMetadata, EvidenceMetadata, IssueMetadata } from '../workspace/types';

// ==================== Timeline Node Content ====================

interface TimelineNodeContentProps {
    data: TimelineMetadata;
}

export const TimelineNodeContent: React.FC<TimelineNodeContentProps> = ({ data }) => {
    const getImportanceColor = (importance: string) => {
        switch (importance) {
            case 'high': return 'text-red-600 bg-red-50 border-red-200';
            case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{data.eventDate instanceof Date ? data.eventDate.toLocaleDateString() : data.eventDate}</span>
            </div>

            <div className="flex items-center gap-2">
                <Badge variant="outline" className={getImportanceColor(data.importance || 'low')}>
                    {data.importance === 'high' ? '重要' : data.importance === 'medium' ? '普通' : '次要'}
                </Badge>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {data.eventType}
                </span>
            </div>

            {data.citedArticles && data.citedArticles.length > 0 && (
                <div className="pt-2 border-t border-gray-100 mt-2">
                    <p className="text-xs text-gray-400 mb-1">引用法条:</p>
                    <div className="flex flex-wrap gap-1">
                        {data.citedArticles.map((article, index) => (
                            <span key={index} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                                {article}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== Evidence Node Content ====================

interface EvidenceNodeContentProps {
    data: EvidenceMetadata;
}

export const EvidenceNodeContent: React.FC<EvidenceNodeContentProps> = ({ data }) => {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'documentary': return <FileText className="w-4 h-4" />;
            case 'testimonial': return <Mic className="w-4 h-4" />;
            case 'physical': return <Box className="w-4 h-4" />;
            case 'electronic': return <Cpu className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getAuthenticityColor = (auth: string) => {
        switch (auth) {
            case 'verified': return 'text-green-600 bg-green-50 border-green-200';
            case 'disputed': return 'text-red-600 bg-red-50 border-red-200';
            case 'unknown': return 'text-gray-600 bg-gray-50 border-gray-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {getTypeIcon(data.evidenceType)}
                    <span>
                        {data.evidenceType === 'documentary' ? '书证' :
                            data.evidenceType === 'testimonial' ? '人证' :
                                data.evidenceType === 'physical' ? '物证' : '电子数据'}
                    </span>
                </div>
                <Badge variant="outline" className={getAuthenticityColor(data.authenticity)}>
                    {data.authenticity === 'verified' ? '已核实' :
                        data.authenticity === 'disputed' ? '有争议' : '未核实'}
                </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">关联性:</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${data.relevance === 'high' ? 'bg-green-500 w-full' :
                            data.relevance === 'medium' ? 'bg-yellow-500 w-2/3' : 'bg-gray-400 w-1/3'
                            }`}
                    />
                </div>
                <span className="text-gray-600 scale-90">
                    {data.relevance === 'high' ? '高' : data.relevance === 'medium' ? '中' : '低'}
                </span>
            </div>

            {data.linkedIssues && data.linkedIssues.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                    <LinkIcon className="w-3 h-3" />
                    <span>关联 {data.linkedIssues.length} 个争议焦点</span>
                </div>
            )}
        </div>
    );
};

// ==================== Issue Node Content ====================

interface IssueNodeContentProps {
    data: IssueMetadata;
}

export const IssueNodeContent: React.FC<IssueNodeContentProps> = ({ data }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'disputed': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'open': return <HelpCircle className="w-4 h-4 text-orange-500" />;
            default: return <HelpCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                    {data.issueType === 'fact' ? '事实认定' :
                        data.issueType === 'law' ? '法律适用' : '程序问题'}
                </Badge>
                <div className="flex items-center gap-1 text-xs font-medium">
                    {getStatusIcon(data.status)}
                    <span className={
                        data.status === 'resolved' ? 'text-green-600' :
                            data.status === 'disputed' ? 'text-red-600' : 'text-orange-600'
                    }>
                        {data.status === 'resolved' ? '已解决' :
                            data.status === 'disputed' ? '有争议' : '待定'}
                    </span>
                </div>
            </div>

            <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-2 rounded border border-gray-100">
                {data.description}
            </p>

            {data.citedArticles && data.citedArticles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {data.citedArticles.slice(0, 2).map((article, index) => (
                        <span key={index} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {article}
                        </span>
                    ))}
                    {data.citedArticles.length > 2 && (
                        <span className="text-[10px] text-gray-400 px-1">+{data.citedArticles.length - 2}</span>
                    )}
                </div>
            )}
        </div>
    );
};
