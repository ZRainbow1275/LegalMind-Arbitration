import React, { useState } from 'react';
import {
    Video,
    Phone,
    Check,
    LogOut
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

export interface Participant {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'idle' | 'in-call' | 'offline';
    isSpeaking?: boolean;
}

interface CollaborationControlProps {
    participants: Participant[];
    isCallActive: boolean;
    onStartCall: (selectedIds: string[], type: 'video' | 'audio') => void;
    onEndCall: () => void;
    onJoinCall: () => void;
    currentUserId?: string;
}

export const CollaborationControl: React.FC<CollaborationControlProps> = ({
    participants,
    isCallActive,
    onStartCall,
    onEndCall,
    // onJoinCall,
    currentUserId = 'me'
}) => {
    // Default select all online participants except self
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
        participants
            .filter(p => p.status !== 'offline' && p.id !== currentUserId)
            .map(p => p.id)
    );

    const onlineParticipants = participants.filter(p => p.status !== 'offline');
    // const activeCallParticipants = participants.filter(p => p.status === 'in-call');

    const handleToggleParticipant = (id: string) => {
        setSelectedParticipants(prev =>
            prev.includes(id)
                ? prev.filter(pId => pId !== id)
                : [...prev, id]
        );
    };

    const handleStartCall = (type: 'video' | 'audio') => {
        onStartCall(selectedParticipants, type);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    className={cn(
                        "flex items-center -space-x-2 cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 rounded-md",
                        isCallActive && "bg-green-50 ring-1 ring-green-200"
                    )}
                    title={isCallActive ? "Call Active - Click to manage" : "Start Collaboration"}
                >
                    {onlineParticipants.slice(0, 3).map((user) => (
                        <div key={user.id} className="relative">
                            <Avatar className={cn(
                                "w-7 h-7 border-2 border-white",
                                isCallActive && user.status === 'in-call' && "border-green-400 ring-2 ring-green-100"
                            )}>
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            {/* Status Dot */}
                            <span className={cn(
                                "absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white",
                                user.status === 'online' && "bg-green-500",
                                user.status === 'idle' && "bg-yellow-500",
                                user.status === 'in-call' && "bg-green-600 animate-pulse",
                                user.status === 'offline' && "bg-gray-400"
                            )} />
                        </div>
                    ))}
                    {onlineParticipants.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                            +{onlineParticipants.length - 3}
                        </div>
                    )}

                    {/* Active Call Indicator Label */}
                    {isCallActive && (
                        <span className="ml-3 text-xs font-medium text-green-600 animate-pulse">
                            通话中
                        </span>
                    )}
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>协作成员</span>
                    <Badge variant="outline" className="font-normal">
                        {onlineParticipants.length} 在线
                    </Badge>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Participant List */}
                <div className="max-h-60 overflow-y-auto py-1">
                    {participants.map((user) => (
                        <div key={user.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded-sm">
                            {/* Checkbox for selection (only if call not active) */}
                            {!isCallActive && user.id !== currentUserId && (
                                <div
                                    className={cn(
                                        "mr-2 w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors",
                                        selectedParticipants.includes(user.id)
                                            ? "bg-orange-500 border-orange-500 text-white"
                                            : "border-gray-300"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleParticipant(user.id);
                                    }}
                                >
                                    {selectedParticipants.includes(user.id) && <Check className="w-3 h-3" />}
                                </div>
                            )}

                            <Avatar className="w-8 h-8 mr-2">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium truncate">{user.name}</span>
                                    {user.id === currentUserId && <span className="text-xs text-gray-400">(我)</span>}
                                </div>
                                <div className="flex items-center text-xs text-gray-500">
                                    <span className={cn(
                                        "w-1.5 h-1.5 rounded-full mr-1.5",
                                        user.status === 'online' && "bg-green-500",
                                        user.status === 'idle' && "bg-yellow-500",
                                        user.status === 'in-call' && "bg-green-600",
                                        user.status === 'offline' && "bg-gray-400"
                                    )} />
                                    {user.status === 'in-call' ? '通话中' :
                                        user.status === 'online' ? '在线' :
                                            user.status === 'idle' ? '离开' : '离线'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <DropdownMenuSeparator />

                {/* Actions */}
                <div className="p-2">
                    {isCallActive ? (
                        <div className="space-y-2">
                            <Button
                                variant="destructive"
                                className="w-full justify-center"
                                onClick={onEndCall}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                结束通话
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                className="justify-center hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                                onClick={() => handleStartCall('audio')}
                                disabled={selectedParticipants.length === 0}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                语音
                            </Button>
                            <Button
                                className="justify-center bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() => handleStartCall('video')}
                                disabled={selectedParticipants.length === 0}
                            >
                                <Video className="w-4 h-4 mr-2" />
                                视频
                            </Button>
                        </div>
                    )}
                </div>

            </DropdownMenuContent>
        </DropdownMenu>
    );
};
