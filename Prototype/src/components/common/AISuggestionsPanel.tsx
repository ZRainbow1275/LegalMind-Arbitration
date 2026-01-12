/**
 * AI建议面板组件
 * 
 * 显示AI智能分析的建议结果
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export interface AISuggestion {
  id: string;
  type: string;
  confidence: number;
  suggestion: string;
}

export interface AISuggestionsPanelProps {
  suggestions: AISuggestion[];
  visible?: boolean;
  demoMode?: boolean;
  className?: string;
}

export const AISuggestionsPanel = React.memo<AISuggestionsPanelProps>(({
  suggestions,
  visible = true,
  demoMode = true,
  className = '',
}) => {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className={`absolute top-24 right-4 z-20 ${className}`}>
      <Card className="bg-white/95 backdrop-blur-sm border-orange-200 shadow-lg w-80">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            AI智能建议
            {demoMode && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                演示模式
              </Badge>
            )}
          </CardTitle>
          {demoMode && (
            <p className="text-xs text-gray-500 mt-1">
              以下为模拟AI分析结果，仅供演示参考
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                  置信度: {Math.round(suggestion.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-sm text-gray-700">{suggestion.suggestion}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
});

AISuggestionsPanel.displayName = 'AISuggestionsPanel';

