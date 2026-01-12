import React, { useEffect, useState, useCallback } from 'react';
import { LegalNode } from '../workspace/types';

interface AIContextAwarenessProps {
    nodes: LegalNode[];
    connections: any[]; // Replace with actual Connection type if available
    onContextUpdate?: (context: AIContext) => void;
}

export interface AIContext {
    summary: string;
    insights: string[];
    suggestedActions: string[];
    entityCount: {
        people: number;
        documents: number;
        issues: number;
    };
}

export const AIContextAwareness: React.FC<AIContextAwarenessProps> = ({
    nodes,
    connections: _connections,
    onContextUpdate
}) => {
    const [_context, setContext] = useState<AIContext | null>(null);

    const analyzeGraph = useCallback(() => {
        // 1. Count entities
        const people = nodes.filter(n => n.type === 'legal-person').length;
        const documents = nodes.filter(n => n.type === 'legal-document').length;
        const issues = nodes.filter(n => n.type === 'legal-issue').length;

        // 2. Generate insights (Mock logic)
        const insights: string[] = [];
        if (issues > 0 && documents === 0) {
            insights.push("Detected legal issues but no supporting documents.");
        }
        if (people > 5) {
            insights.push("High number of involved parties detected. Consider grouping.");
        }

        // 3. Suggest actions
        const suggestedActions: string[] = [];
        if (documents > 0) {
            suggestedActions.push("Review document authenticity.");
        }
        if (issues > 0) {
            suggestedActions.push("Link evidence to issues.");
        }

        const newContext: AIContext = {
            summary: `Case involves ${people} people, ${documents} documents, and ${issues} issues.`,
            insights,
            suggestedActions,
            entityCount: { people, documents, issues }
        };

        setContext(newContext);
        if (onContextUpdate) {
            onContextUpdate(newContext);
        }
    }, [nodes, onContextUpdate]);

    // Debounce analysis
    useEffect(() => {
        const timer = setTimeout(() => {
            analyzeGraph();
        }, 2000); // Analyze 2 seconds after changes stop

        return () => clearTimeout(timer);
    }, [analyzeGraph]);

    return null; // Invisible component
};
