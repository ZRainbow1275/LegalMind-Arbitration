import React, { useState, useRef, useEffect } from 'react';
import { LegalNodeTypes } from '../../plugins/legal-nodes/types';

interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
}

interface AISuggestion {
  id: string;
  type: 'create-node' | 'create-connection' | 'analysis' | 'recommendation';
  title: string;
  description: string;
  action?: () => void;
  nodeType?: LegalNodeTypes;
  confidence: number;
}

interface EnhancedAIAssistantProps {
  onCreateNode?: (nodeType: LegalNodeTypes, data?: any) => void;
  onCreateConnection?: (sourceId: string, targetId: string, type: string) => void;
  onAnalyzeCase?: () => void;
  currentNodes: any[];
}

export const EnhancedAIAssistant: React.FC<EnhancedAIAssistantProps> = ({
  onCreateNode,
  onAnalyzeCase,
  currentNodes
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: '您好！我是LegalMind AI法律助手。我可以帮助您：\n\n• 智能创建法律节点\n• 分析案件关系\n• 推荐最佳实践\n• 生成法律文档\n\n请告诉我您需要什么帮助？',
      timestamp: new Date(),
      suggestions: [
        {
          id: 's1',
          type: 'create-node',
          title: '创建新案件',
          description: '快速创建一个新的案件信息节点',
          nodeType: LegalNodeTypes.case,
          confidence: 0.9
        },
        {
          id: 's2',
          type: 'create-node',
          title: '安排庭审',
          description: '为当前案件安排在线或线下庭审',
          nodeType: LegalNodeTypes.hearing,
          confidence: 0.95
        },
        {
          id: 's3',
          type: 'create-node',
          title: '创建时间轴',
          description: '建立案件关键节点时间轴',
          nodeType: LegalNodeTypes.timeline,
          confidence: 0.85
        },
        {
          id: 's4',
          type: 'analysis',
          title: '分析当前工作台',
          description: '分析当前节点和关系，提供优化建议',
          confidence: 0.8
        }
      ]
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputText, currentNodes);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAIResponse = (userInput: string, nodes: any[]): AIMessage => {
    const input = userInput.toLowerCase();

    // 简单的关键词匹配和响应生成
    if (input.includes('案件') || input.includes('case')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: '我理解您想要处理案件相关的内容。基于您的需求，我建议：',
        timestamp: new Date(),
        suggestions: [
          {
            id: 'case-create',
            type: 'create-node',
            title: '创建案件节点',
            description: '创建一个新的案件信息节点',
            nodeType: LegalNodeTypes.case,
            confidence: 0.95
          },
          {
            id: 'case-analysis',
            type: 'analysis',
            title: '案件分析',
            description: '分析现有案件节点的关系和状态',
            confidence: 0.85
          }
        ]
      };
    }

    if (input.includes('人物') || input.includes('当事人') || input.includes('person')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: '我可以帮您管理案件中的人物关系。建议的操作：',
        timestamp: new Date(),
        suggestions: [
          {
            id: 'person-create',
            type: 'create-node',
            title: '添加人物',
            description: '创建新的人物关系节点',
            nodeType: LegalNodeTypes.person,
            confidence: 0.9
          },
          {
            id: 'person-connect',
            type: 'create-connection',
            title: '建立关系',
            description: '在人物和案件之间建立关系连接',
            confidence: 0.8
          }
        ]
      };
    }

    if (input.includes('文档') || input.includes('document')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: '文档管理是案件处理的重要环节。我建议：',
        timestamp: new Date(),
        suggestions: [
          {
            id: 'doc-create',
            type: 'create-node',
            title: '创建文档节点',
            description: '添加新的法律文档节点',
            nodeType: LegalNodeTypes.document,
            confidence: 0.9
          },
          {
            id: 'doc-organize',
            type: 'recommendation',
            title: '文档分类',
            description: '按照文档类型和重要性进行分类整理',
            confidence: 0.85
          }
        ]
      };
    }

    if (input.includes('分析') || input.includes('analysis')) {
      const nodeCount = nodes.length;
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `当前工作台分析：\n\n• 节点总数：${nodeCount}\n• 建议添加更多连接关系\n• 可以考虑添加时间轴节点来跟踪重要事件`,
        timestamp: new Date(),
        suggestions: [
          {
            id: 'timeline-create',
            type: 'create-node',
            title: '添加时间轴',
            description: '创建时间轴节点跟踪案件进展',
            nodeType: LegalNodeTypes.timeline,
            confidence: 0.8
          },
          {
            id: 'process-create',
            type: 'create-node',
            title: '创建流程',
            description: '建立案件处理流程模板',
            nodeType: LegalNodeTypes.process,
            confidence: 0.75
          }
        ]
      };
    }

    // 默认响应
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: '我理解您的需求。基于当前的工作台状态，我建议您可以：',
      timestamp: new Date(),
      suggestions: [
        {
          id: 'general-case',
          type: 'create-node',
          title: '创建案件',
          description: '开始一个新的法律案件',
          nodeType: LegalNodeTypes.case,
          confidence: 0.7
        },
        {
          id: 'general-person',
          type: 'create-node',
          title: '添加人物',
          description: '添加案件相关人员',
          nodeType: LegalNodeTypes.person,
          confidence: 0.7
        },
        {
          id: 'general-analysis',
          type: 'analysis',
          title: '工作台分析',
          description: '分析当前工作台的结构和关系',
          confidence: 0.6
        }
      ]
    };
  };

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    switch (suggestion.type) {
      case 'create-node':
        if (suggestion.nodeType && onCreateNode) {
          onCreateNode(suggestion.nodeType);
          // 添加确认消息
          const confirmMessage: AIMessage = {
            id: Date.now().toString(),
            type: 'assistant',
            content: `✅ 已为您创建${suggestion.title}！您可以双击节点进行编辑。`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, confirmMessage]);
        }
        break;
      case 'analysis':
        if (onAnalyzeCase) {
          onAnalyzeCase();
        }
        break;
      case 'create-connection': {
        const connectionMessage: AIMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: '💡 请点击左侧的连接工具栏，然后依次点击两个节点来创建连接。',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, connectionMessage]);
        break;
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'white'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{
          margin: '0',
          color: '#FF6B35',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤖 AI法律助手
          <span style={{
            fontSize: '10px',
            backgroundColor: '#4caf50',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px'
          }}>
            在线
          </span>
        </h3>
      </div>

      {/* 消息区域 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((message) => (
          <div key={message.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: message.type === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: message.type === 'user' ? '#FF6B35' : '#f1f3f4',
              color: message.type === 'user' ? 'white' : '#333',
              fontSize: '14px',
              lineHeight: '1.4',
              whiteSpace: 'pre-line'
            }}>
              {message.content}
            </div>

            <div style={{
              fontSize: '11px',
              color: '#999',
              marginTop: '4px'
            }}>
              {formatTime(message.timestamp)}
            </div>

            {/* AI建议 */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%'
              }}>
                {message.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#FF6B35';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    <div style={{ fontWeight: '500', color: '#333' }}>
                      {suggestion.title}
                    </div>
                    <div style={{ color: '#666', marginTop: '2px' }}>
                      {suggestion.description}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#999',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>置信度: {Math.round(suggestion.confidence * 100)}%</span>
                      <div style={{
                        width: '30px',
                        height: '3px',
                        backgroundColor: '#eee',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${suggestion.confidence * 100}%`,
                          height: '100%',
                          backgroundColor: suggestion.confidence > 0.8 ? '#4caf50' :
                            suggestion.confidence > 0.6 ? '#ff9800' : '#f44336'
                        }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 正在输入指示器 */}
        {isTyping && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#666',
            fontSize: '12px'
          }}>
            <div style={{
              display: 'flex',
              gap: '2px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#FF6B35',
                animation: 'pulse 1.5s infinite'
              }} />
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#FF6B35',
                animation: 'pulse 1.5s infinite 0.5s'
              }} />
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#FF6B35',
                animation: 'pulse 1.5s infinite 1s'
              }} />
            </div>
            AI正在思考...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #eee',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="请描述您的需求..."
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '14px',
              outline: 'none'
            }}
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '20px',
              backgroundColor: inputText.trim() && !isTyping ? '#FF6B35' : '#ddd',
              color: 'white',
              cursor: inputText.trim() && !isTyping ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            发送
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};
