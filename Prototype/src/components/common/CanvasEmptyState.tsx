import React from 'react';
import { motion } from 'framer-motion';
import { FileUp, Plus, LayoutTemplate, MousePointerClick } from 'lucide-react';
import { Button } from '../ui/button';

interface CanvasEmptyStateProps {
    onCreateNode: () => void;
    onImportFile: () => void;
    onSelectTemplate: () => void;
}

export const CanvasEmptyState: React.FC<CanvasEmptyStateProps> = ({
    onCreateNode,
    onImportFile,
    onSelectTemplate,
}) => {
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-orange-100 max-w-2xl w-full mx-4 pointer-events-auto text-center"
            >
                <motion.div variants={itemVariants} className="mb-6">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <LayoutTemplate className="w-10 h-10 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎使用 LegalMind</h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                        您的智能法律工作台已准备就绪。开始构建您的案情分析、证据链或法律研究图谱。
                    </p>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                        variant="outline"
                        className="h-auto py-6 flex flex-col gap-3 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                        onClick={onCreateNode}
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-gray-800">新建节点</div>
                            <div className="text-xs text-gray-400 mt-1">创建一个新的法律实体</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto py-6 flex flex-col gap-3 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                        onClick={onImportFile}
                    >
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-gray-800">导入文件</div>
                            <div className="text-xs text-gray-400 mt-1">支持 PDF, Word, Excel</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto py-6 flex flex-col gap-3 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                        onClick={onSelectTemplate}
                    >
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <LayoutTemplate className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-gray-800">使用模板</div>
                            <div className="text-xs text-gray-400 mt-1">快速开始常用工作流</div>
                        </div>
                    </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4" />
                        <span>双击画布新建</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="kbd px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">Space</span>
                        <span>+ 拖拽移动画布</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="kbd px-2 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono text-xs">Ctrl</span>
                        <span>+ 滚轮缩放</span>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};
