import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, MessageSquare, X, Gavel } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AIBailiffProps {
    className?: string;
    onChatOpen?: () => void;
}

export const AIBailiff: React.FC<AIBailiffProps> = ({ className, onChatOpen }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        const messages = [
            "需要协助整理证据吗？",
            "我可以帮您起草文书",
            "庭审记录已同步"
        ]

        const interval = setInterval(() => {
            if (!isExpanded && Math.random() > 0.7) {
                setMessage(messages[Math.floor(Math.random() * messages.length)])
                setTimeout(() => setMessage(null), 3000)
            }
        }, 10000)

        return () => clearInterval(interval)
    }, [isExpanded])

    return (
        <div className={cn("fixed bottom-8 right-8 z-50", className)}>
            <AnimatePresence>
                {message && !isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full right-0 mb-3 bg-card border border-border px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
                    >
                        <span className="text-xs font-medium text-foreground">{message}</span>
                        <div className="absolute bottom-[-4px] right-6 w-2 h-2 bg-card border-b border-r border-border transform rotate-45"></div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                drag
                dragMomentum={false}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "relative flex items-center justify-center",
                    "bg-gradient-to-br from-primary to-primary/80",
                    "text-primary-foreground shadow-xl cursor-pointer",
                    isExpanded ? "rounded-2xl w-64 h-auto p-4" : "rounded-full w-14 h-14"
                )}
                onClick={() => !isExpanded && setIsExpanded(true)}
                layout
            >
                {/* 核心图标 */}
                <motion.div layout="position" className="relative">
                    {!isExpanded ? (
                        <div className="relative">
                            <Gavel size={24} />
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                            />
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 w-full">
                            <div className="p-2 bg-primary-foreground/10 rounded-lg shrink-0">
                                <Bot size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-1">AI 法律助手</h4>
                                <p className="text-xs opacity-90 leading-relaxed">
                                    我是您的智能法警。我可以协助您整理证据、分析案情或起草法律文书。
                                </p>

                                <div className="mt-3 flex flex-col gap-2">
                                    <button
                                        className="w-full text-left px-3 py-2 bg-background/10 hover:bg-background/20 rounded text-xs transition-colors flex items-center gap-2"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onChatOpen?.()
                                        }}
                                    >
                                        <MessageSquare size={12} />
                                        开始对话
                                    </button>
                                    <button
                                        className="w-full text-left px-3 py-2 bg-background/10 hover:bg-background/20 rounded text-xs transition-colors flex items-center gap-2"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            // TODO: Implement analysis
                                            console.log('Analysis requested');
                                        }}
                                    >
                                        <Sparkles size={12} />
                                        分析当前画布
                                    </button>
                                </div>
                            </div>
                            <button
                                className="absolute top-0 right-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsExpanded(false)
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    )
}
