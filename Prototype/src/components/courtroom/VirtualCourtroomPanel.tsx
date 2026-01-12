import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    Mic,
    MicOff,
    MonitorPlay,
    Shield,
    FileText,
    Gavel,
    Lock
} from 'lucide-react';
import { DraggablePanel } from '../common/DraggablePanel';
import { Badge } from '../ui/badge';

interface CourtParticipant {
    id: string;
    name: string;
    role: 'arbitrator' | 'applicant' | 'respondent' | 'witness' | 'clerk';
    status: 'online' | 'offline' | 'speaking' | 'muted';
    isPresenter?: boolean;
}

interface ChatMessage {
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
    isPrivate?: boolean;
}

interface VirtualCourtroomPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onPresentationModeChange: (enabled: boolean) => void;
    onEvidenceSelect: (evidenceId: string) => void;
}

export const VirtualCourtroomPanel: React.FC<VirtualCourtroomPanelProps> = ({
    isOpen,
    onClose,
    onPresentationModeChange
}) => {
    const [activeTab, setActiveTab] = useState('participants');
    const [isPresentationMode, setIsPresentationMode] = useState(false);

    // 模拟参与者数据
    const participants: CourtParticipant[] = [
        { id: '1', name: '王仲裁员', role: 'arbitrator', status: 'online' },
        { id: '2', name: '张三 (申请人)', role: 'applicant', status: 'speaking', isPresenter: true },
        { id: '3', name: '李四 (被申请人)', role: 'respondent', status: 'online' },
        { id: '4', name: '赵书记员', role: 'clerk', status: 'online' },
    ];

    // 模拟聊天记录
    const [messages] = useState<ChatMessage[]>([
        { id: '1', senderId: '1', content: '现在开庭，请申请人陈述。', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
        { id: '2', senderId: '2', content: '好的，仲裁员。', timestamp: new Date(Date.now() - 1000 * 60 * 4) },
    ]);

    const [privateMessages] = useState<ChatMessage[]>([
        { id: 'p1', senderId: '2', content: '律师，这个证据我们现在提交吗？', timestamp: new Date(Date.now() - 1000 * 60 * 2), isPrivate: true },
        { id: 'p2', senderId: 'self', content: '稍等，等对方说完。', timestamp: new Date(Date.now() - 1000 * 60 * 1), isPrivate: true },
    ]);

    // AI Clerk Logs
    const [clerkLogs, setClerkLogs] = useState<{ id: string; type: 'transcription' | 'reminder'; content: string; timestamp: Date }[]>([
        { id: 'c1', type: 'reminder', content: '庭审开始，请核对当事人身份。', timestamp: new Date(Date.now() - 1000 * 60 * 6) },
        { id: 'c2', type: 'transcription', content: '王仲裁员：现在开庭，请申请人陈述。', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
        { id: 'c3', type: 'transcription', content: '张三 (申请人)：好的，仲裁员。我方主张...', timestamp: new Date(Date.now() - 1000 * 60 * 4) },
    ]);

    // Simulate live logs
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const type: 'transcription' | 'reminder' = Math.random() > 0.8 ? 'reminder' : 'transcription';
                const newLog = {
                    id: Date.now().toString(),
                    type: type,
                    content: type === 'reminder' ? '系统提醒：请注意发言语速。' : '李四 (被申请人)：我反对对方的说法...',
                    timestamp: new Date()
                };
                setClerkLogs(prev => [newLog, ...prev]);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const togglePresentationMode = () => {
        const newState = !isPresentationMode;
        setIsPresentationMode(newState);
        onPresentationModeChange(newState);
    };

    if (!isOpen) return null;

    return (
        <DraggablePanel
            title="虚拟法庭"
            initialPosition={{ x: 100, y: 100 }}
            width={800}
            height={600}
            onClose={onClose}
            className="virtual-courtroom-panel"
        >
            <div className="flex flex-col h-full bg-white text-gray-900">
                {/* Header - now handled by DraggablePanel, but keeping internal header for controls if needed */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Badge variant={isPresentationMode ? "destructive" : "secondary"} className="animate-pulse">
                            {isPresentationMode ? "演示模式中" : "准备就绪"}
                        </Badge>
                        <span className="text-xs text-gray-500">案件号: ARB-2024-001</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={isPresentationMode ? "destructive" : "outline"}
                            size="sm"
                            onClick={togglePresentationMode}
                            className="h-8 text-xs"
                        >
                            <MonitorPlay className="w-3 h-3 mr-1" />
                            {isPresentationMode ? "结束演示" : "开始演示"}
                        </Button>
                    </div>
                </div>
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-semibold text-sm text-gray-800">虚拟法庭</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant={isPresentationMode ? "default" : "outline"}
                            size="sm"
                            className={`h-6 text-xs px-2 ${isPresentationMode ? 'bg-red-600 hover:bg-red-700' : ''}`}
                            onClick={togglePresentationMode}
                            title="广播演示模式"
                        >
                            <MonitorPlay className="w-3 h-3 mr-1" />
                            {isPresentationMode ? '演示中' : '演示'}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                        <div className="px-2 pt-2 shrink-0">
                            <TabsList className="w-full grid grid-cols-4 h-8">
                                <TabsTrigger value="participants" className="text-xs px-1 h-7">参与者</TabsTrigger>
                                <TabsTrigger value="chat" className="text-xs px-1 h-7">公屏</TabsTrigger>
                                <TabsTrigger value="private" className="text-xs px-1 h-7 flex items-center gap-1 justify-center">
                                    <Lock className="w-3 h-3" />
                                    私密
                                </TabsTrigger>
                                <TabsTrigger value="clerk" className="text-xs px-1 h-7 flex items-center gap-1 justify-center">
                                    <FileText className="w-3 h-3" />
                                    书记
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Participants Tab */}
                        <TabsContent value="participants" className="flex-1 overflow-hidden flex flex-col min-h-0 mt-0">
                            <ScrollArea className="flex-1 p-2">
                                <div className="space-y-2">
                                    {participants.map(participant => (
                                        <div key={participant.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${participant.status === 'online' ? 'bg-green-500' : participant.status === 'speaking' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                                <span className="text-sm font-medium text-gray-800">{participant.name}</span>
                                                {participant.isPresenter && <MonitorPlay className="w-3 h-3 text-red-500" />}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {participant.status === 'speaking' ? (
                                                    <Mic className="w-3 h-3 text-blue-500" />
                                                ) : (
                                                    <MicOff className="w-3 h-3 text-gray-400" />
                                                )}
                                                {participant.role === 'arbitrator' && <Shield className="w-3 h-3 text-indigo-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* Public Chat Tab */}
                        <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col p-0 min-h-0 mt-0">
                            <ScrollArea className="flex-1 p-3">
                                <div className="space-y-3">
                                    {messages.map(message => (
                                        <div key={message.id} className="flex flex-col">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {participants.find(p => p.id === message.senderId)?.name || '未知'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-0.5">{message.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-2 border-t border-gray-200 bg-gray-50 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="发送消息..."
                                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                    />
                                    <Button size="sm" variant="secondary" className="h-8 shadow-sm">发送</Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Private Chat Tab */}
                        <TabsContent value="private" className="flex-1 overflow-hidden flex flex-col p-0 min-h-0 mt-0">
                            <ScrollArea className="flex-1 p-3">
                                <div className="space-y-3">
                                    {privateMessages.map(message => (
                                        <div key={message.id} className={`flex flex-col ${message.senderId === 'self' ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xs font-semibold text-gray-700">
                                                    {message.senderId === 'self' ? '我' : participants.find(p => p.id === message.senderId)?.name || '未知'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className={`text-sm p-2 rounded-lg mt-0.5 max-w-[90%] ${message.senderId === 'self' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {message.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-2 border-t border-gray-200 bg-gray-50 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="发送私密消息..."
                                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                    />
                                    <Button size="sm" variant="secondary" className="h-8 shadow-sm">发送</Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* AI Clerk Tab */}
                        <TabsContent value="clerk" className="flex-1 overflow-hidden flex flex-col p-0 min-h-0 mt-0">
                            <div className="bg-slate-50 p-2 text-xs text-slate-600 border-b border-slate-200 flex items-center justify-center gap-1 shrink-0">
                                <FileText className="w-3 h-3" />
                                AI书记员：实时笔录与流程提醒
                            </div>
                            <ScrollArea className="flex-1 p-3">
                                <div className="space-y-3">
                                    {clerkLogs.map(log => (
                                        <div key={log.id} className="flex gap-2">
                                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.type === 'reminder' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-xs font-medium ${log.type === 'reminder' ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        {log.type === 'reminder' ? '系统提醒' : '庭审笔录'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`text-sm leading-relaxed ${log.type === 'reminder' ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                                                    {log.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                                <span className="text-xs text-gray-500">正在录音中...</span>
                                <div className="flex gap-1">
                                    <div className="w-1 h-3 bg-green-500 animate-pulse rounded-full" style={{ animationDelay: '0ms' }} />
                                    <div className="w-1 h-3 bg-green-500 animate-pulse rounded-full" style={{ animationDelay: '100ms' }} />
                                    <div className="w-1 h-3 bg-green-500 animate-pulse rounded-full" style={{ animationDelay: '200ms' }} />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DraggablePanel>
    );
};
