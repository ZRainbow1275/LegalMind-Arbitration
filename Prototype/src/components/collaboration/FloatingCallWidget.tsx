import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { useMediaStream } from '../../hooks/useMediaStream';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    MonitorUp, Settings, Maximize2, Minimize2,
    Smile, X, GripHorizontal
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Slider } from '../ui/slider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface FloatingCallWidgetProps {
    initialPosition?: { x: number; y: number };
    participants: { id: string; name: string; avatar?: string; isSpeaking?: boolean }[];
    isMuted: boolean;
    isVideoOn: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onEndCall: () => void;
}

// Isolated Audio Waveform for Self (prevents parent re-renders)
const SelfAudioWaveform = ({ isMuted, getAudioLevel }: { isMuted: boolean, getAudioLevel: () => number }) => {
    const [level, setLevel] = useState(0);

    useEffect(() => {
        if (isMuted) {
            setLevel(0);
            return;
        }
        const interval = setInterval(() => {
            setLevel(getAudioLevel());
        }, 100);
        return () => clearInterval(interval);
    }, [isMuted, getAudioLevel]);

    const normalizedLevel = Math.min(100, Math.max(20, (level / 50) * 100));

    return (
        <div className="flex items-center gap-0.5 h-3">
            {[1, 2, 3, 4].map((i) => (
                <motion.div
                    key={i}
                    className="w-0.5 bg-green-500 rounded-full"
                    animate={{
                        height: `${Math.max(20, normalizedLevel * (0.5 + Math.random() * 0.5))}%`
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
            ))}
        </div>
    );
};

// Isolated Audio Waveform for Remote Participants (prevents parent re-renders)
const RemoteAudioWaveform = ({ isSpeaking }: { isSpeaking?: boolean }) => {
    const [randomLevel, setRandomLevel] = useState(20);

    useEffect(() => {
        if (!isSpeaking) {
            setRandomLevel(20);
            return;
        }
        const interval = setInterval(() => {
            setRandomLevel(Math.random() * 50 + 20);
        }, 150);
        return () => clearInterval(interval);
    }, [isSpeaking]);

    return (
        <div className="flex items-center gap-0.5 h-3">
            {[1, 2, 3, 4].map((i) => (
                <motion.div
                    key={i}
                    className="w-0.5 bg-green-500 rounded-full"
                    animate={{
                        height: `${Math.max(20, randomLevel * (0.5 + Math.random() * 0.5))}%`
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
            ))}
        </div>
    );
};

export const FloatingCallWidget: React.FC<FloatingCallWidgetProps> = ({
    initialPosition = { x: window.innerWidth - 380, y: 20 },
    participants,
    isMuted: initialIsMuted,
    isVideoOn: initialIsVideoOn,
    onToggleMute: propToggleMute,
    onToggleVideo: propToggleVideo,
    onEndCall,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Manual Motion Values for Dragging (Bypasses React Render Cycle)
    const x = useMotionValue(initialPosition.x);
    const y = useMotionValue(initialPosition.y);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Real Media Stream Hook
    const {
        localStream,
        screenStream,
        startLocalStream,
        stopLocalStream,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        getAudioLevel
    } = useMediaStream();

    const videoRef = useRef<HTMLVideoElement>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(initialIsMuted);
    const [isVideoOn, setIsVideoOn] = useState(initialIsVideoOn);
    const [showSettings, setShowSettings] = useState(false);
    const [activeReaction, setActiveReaction] = useState<{ emoji: string, id: number } | null>(null);

    // Initialize Media
    useEffect(() => {
        startLocalStream(initialIsVideoOn, !initialIsMuted);
        return () => {
            stopLocalStream();
        };
    }, [initialIsVideoOn, initialIsMuted, startLocalStream, stopLocalStream]);

    // Attach stream to video element
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream, isVideoOn]);

    // Attach screen stream
    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
            setIsExpanded(true); // Auto expand on screen share
        }
    }, [screenStream]);

    // Manual Drag Logic
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!isDragging.current) return;

            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;

            // Update motion values directly (no re-render)
            x.set(newX);
            y.set(newY);
        };

        const handlePointerUp = () => {
            isDragging.current = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [x, y]);

    const startDrag = (e: React.PointerEvent) => {
        // Prevent dragging if clicking buttons/inputs
        if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;

        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - x.get(),
            y: e.clientY - y.get()
        };
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
    };

    const handleToggleMute = () => {
        const enabled = toggleAudio();
        setIsMuted(!enabled);
        propToggleMute();
    };

    const handleToggleVideo = () => {
        const enabled = toggleVideo();
        setIsVideoOn(enabled);
        propToggleVideo();
    };

    const handleReaction = (emoji: string) => {
        const id = Date.now();
        setActiveReaction({ emoji, id });
        setTimeout(() => setActiveReaction(null), 2000);
    };

    return (
        <>
            <motion.div
                style={{ x, y }}
                animate={{
                    width: isExpanded ? 400 : "auto",
                    transition: { type: "spring", stiffness: 400, damping: 30 }
                }}
                className={`fixed top-0 left-0 z-50 flex flex-col bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 overflow-hidden`}
            >
                {/* Reaction Overlay */}
                <AnimatePresence>
                    {activeReaction && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1.5, y: -50 }}
                            exit={{ opacity: 0, scale: 0.5, y: -100 }}
                            className="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
                        >
                            <span className="text-6xl filter drop-shadow-lg">{activeReaction.emoji}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header / Drag Handle */}
                <div
                    onPointerDown={startDrag}
                    className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing select-none group border-b border-gray-100/50"
                >
                    <div className="flex items-center gap-2.5 pointer-events-none">
                        <div className={`w-2 h-2 rounded-full ${participants.length > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500'} animate-pulse`} />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800 tracking-tight">
                                {isExpanded ? 'LegalMind Connect' : '正在通话'}
                            </span>
                            {isExpanded && (
                                <span className="text-[10px] text-gray-500 font-medium">
                                    {participants.length + 1} 人在线 • 加密连接
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <GripHorizontal className="w-4 h-4 text-gray-300 mr-2" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-black/5 text-gray-500"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {isExpanded ? (
                        // Expanded Mode
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4 pt-4 space-y-4"
                        >
                            {/* Screen Share View */}
                            {screenStream && (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-orange-500/30 shadow-lg mb-2"
                                >
                                    <video
                                        ref={screenVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-contain"
                                    />
                                    <div className="absolute top-2 left-2 bg-orange-500/90 px-2 py-1 rounded text-[10px] text-white font-medium">
                                        正在共享屏幕
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="absolute top-2 right-2 h-6 text-xs"
                                        onClick={stopScreenShare}
                                    >
                                        停止共享
                                    </Button>
                                </motion.div>
                            )}

                            {/* Video Grid */}
                            <div className={`grid ${screenStream ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                                {/* Remote Participants */}
                                {participants.map((user) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative aspect-video bg-gray-100/50 rounded-2xl overflow-hidden border border-white/60 shadow-inner group"
                                    >
                                        <Avatar className="absolute inset-0 m-auto w-12 h-12 ring-4 ring-white/30">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 font-bold">
                                                {user.name.slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                            <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-700 shadow-sm flex items-center gap-1.5">
                                                {user.name}
                                                {/* Simulated remote audio */}
                                                <RemoteAudioWaveform isSpeaking={user.isSpeaking} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Self View (Me) - REAL VIDEO */}
                                <motion.div
                                    className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-white/20 shadow-lg group"
                                >
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={`w-full h-full object-cover transform scale-x-[-1] ${!isVideoOn ? 'hidden' : ''}`}
                                    />
                                    {!isVideoOn && (
                                        <Avatar className="absolute inset-0 m-auto w-12 h-12 ring-4 ring-white/10">
                                            <AvatarFallback className="bg-gray-700 text-white font-bold">Me</AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-medium text-white flex items-center gap-1.5 border border-white/10">
                                        我 (Me)
                                        <SelfAudioWaveform isMuted={isMuted} getAudioLevel={getAudioLevel} />
                                    </div>

                                    {isMuted && (
                                        <div className="absolute top-2 right-2 bg-red-500/90 p-1 rounded-full">
                                            <MicOff className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Controls Bar */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className={`h-10 w-10 rounded-2xl border-0 shadow-sm transition-all duration-200 ${isMuted ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                    onClick={handleToggleMute}
                                                >
                                                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isMuted ? '取消静音' : '静音'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className={`h-10 w-10 rounded-2xl border-0 shadow-sm transition-all duration-200 ${!isVideoOn ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                    onClick={handleToggleVideo}
                                                >
                                                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isVideoOn ? '关闭摄像头' : '开启摄像头'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>

                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant={screenStream ? "default" : "ghost"}
                                                    size="icon"
                                                    className={`h-9 w-9 rounded-xl ${screenStream ? 'bg-orange-500 text-white hover:bg-orange-600' : 'text-gray-500 hover:bg-gray-100'}`}
                                                    onClick={screenStream ? stopScreenShare : startScreenShare}
                                                >
                                                    <MonitorUp className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>屏幕共享</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-gray-500 hover:bg-gray-100">
                                                <Smile className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center" className="flex gap-2 p-2">
                                            {['👍', '👏', '❤️', '🤔', '🎉'].map(emoji => (
                                                <DropdownMenuItem
                                                    key={emoji}
                                                    className="text-2xl hover:scale-125 transition-transform p-1 cursor-pointer"
                                                    onClick={() => handleReaction(emoji)}
                                                >
                                                    {emoji}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl text-gray-500 hover:bg-gray-100"
                                        onClick={() => setShowSettings(true)}
                                    >
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-10 w-10 rounded-2xl shadow-red-200 shadow-lg hover:shadow-red-300 hover:scale-105 transition-all"
                                    onClick={onEndCall}
                                >
                                    <PhoneOff className="w-5 h-5" />
                                </Button>
                            </div>
                        </motion.div>
                    ) : (
                        // Collapsed Mode: Pill
                        <motion.div
                            key="collapsed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-4 px-1 pb-1"
                        >
                            <div className="flex -space-x-3">
                                {participants.slice(0, 3).map((user) => (
                                    <Avatar key={user.id} className="w-9 h-9 border-2 border-white ring-1 ring-gray-100 shadow-sm">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-medium text-gray-600">
                                            {user.name.slice(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {/* Self Avatar in Pill Mode */}
                                <Avatar className="w-9 h-9 border-2 border-white ring-1 ring-gray-100 shadow-sm">
                                    <AvatarFallback className="bg-gray-800 text-white text-xs font-medium">Me</AvatarFallback>
                                </Avatar>
                            </div>

                            <div className="h-8 w-px bg-gray-200/60" />

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`w-9 h-9 rounded-full transition-colors ${isMuted ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-100'}`}
                                    onClick={handleToggleMute}
                                >
                                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-9 h-9 rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    onClick={onEndCall}
                                >
                                    <PhoneOff className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Settings Modal (Inline) */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl p-6 w-80"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">通话设置</h3>
                                    <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">麦克风音量</label>
                                        <Slider defaultValue={[75]} max={100} step={1} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">扬声器音量</label>
                                        <Slider defaultValue={[50]} max={100} step={1} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">视频质量</label>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="flex-1">720p</Button>
                                            <Button variant="default" size="sm" className="flex-1">1080p</Button>
                                            <Button variant="outline" size="sm" className="flex-1">4K</Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
};
