/**
 * 节点创建面板组件
 * 
 * 用于创建各种类型的法律节点
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { LegalNode } from '../workspace/types';

export interface NodeTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}

export interface NodeCreationPanelProps {
  nodeTypeConfig: Record<string, NodeTypeConfig>;
  onCreateNode: (type: LegalNode['type']) => void;
  visible?: boolean;
  className?: string;
}

export const NodeCreationPanel = React.memo<NodeCreationPanelProps>(({
  nodeTypeConfig,
  onCreateNode,
  visible = true,
  className = '',
}) => {
  if (!visible) return null;

  return (
    <div className={`absolute top-4 left-4 z-20 ${className}`}>
      <Card className="bg-white/98 backdrop-blur-md border-orange-300 shadow-xl w-72">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
          <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
            创建法律节点
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {Object.entries(nodeTypeConfig).map(([type, config]) => {
            const IconComponent = config.icon;
            return (
              <Button
                key={type}
                variant="outline"
                className="w-full justify-start border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 hover:shadow-md"
                onClick={() => onCreateNode(type as LegalNode['type'])}
              >
                <div className={`w-7 h-7 rounded-lg ${config.color} mr-3 flex items-center justify-center shadow-sm`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">{config.label}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
});

NodeCreationPanel.displayName = 'NodeCreationPanel';

