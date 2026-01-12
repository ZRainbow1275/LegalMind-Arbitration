/**
 * 元素工具栏
 * 
 * 提供创建各种元素的工具按钮
 */

import React from 'react';
import { useCanvasStore } from '../../lib/canvas-store';
import { ElementFactory } from '../../lib/element-factory';

interface ElementToolbarProps {
  onElementCreated?: (elementId: string) => void;
}

export const ElementToolbar: React.FC<ElementToolbarProps> = ({
  onElementCreated,
}) => {
  const { addElement } = useCanvasStore();
  
  // 创建元素的辅助函数
  const createElement = (type: string) => {
    // 在画布中心创建元素
    const position = { x: 400, y: 300 };
    
    let element;
    
    switch (type) {
      case 'text':
        element = ElementFactory.createText(position, '双击编辑文本');
        break;
      
      case 'image':
        element = ElementFactory.createImage(position, 'https://via.placeholder.com/300x200');
        break;
      
      case 'rectangle':
        element = ElementFactory.createShape(position, 'rectangle');
        break;
      
      case 'circle':
        element = ElementFactory.createShape(position, 'circle');
        break;
      
      case 'table':
        element = ElementFactory.createTable(position, 3, 3);
        break;
      
      case 'sticky-note':
        element = ElementFactory.createStickyNote(position, '便签内容', 'yellow');
        break;
      
      case 'frame':
        element = ElementFactory.createFrame(position, { width: 400, height: 300 }, '新框架');
        break;
      
      case 'case':
        element = ElementFactory.createLegalNode(position, 'case', '案件节点');
        break;
      
      case 'party':
        element = ElementFactory.createLegalNode(position, 'party', '当事人');
        break;
      
      case 'evidence':
        element = ElementFactory.createLegalNode(position, 'evidence', '证据');
        break;
      
      default:
        return;
    }
    
    addElement(element);
    onElementCreated?.(element.id);
  };
  
  const toolGroups = [
    {
      name: '基础元素',
      tools: [
        { id: 'text', icon: '📝', label: '文本' },
        { id: 'image', icon: '🖼️', label: '图片' },
        { id: 'rectangle', icon: '▭', label: '矩形' },
        { id: 'circle', icon: '●', label: '圆形' },
      ],
    },
    {
      name: '容器',
      tools: [
        { id: 'frame', icon: '🖼', label: '框架' },
        { id: 'table', icon: '📊', label: '表格' },
        { id: 'sticky-note', icon: '📌', label: '便签' },
      ],
    },
    {
      name: '法律节点',
      tools: [
        { id: 'case', icon: '⚖️', label: '案件' },
        { id: 'party', icon: '👤', label: '当事人' },
        { id: 'evidence', icon: '📄', label: '证据' },
      ],
    },
  ];
  
  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        padding: 16,
        width: 200,
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 16,
          color: '#1f2937',
        }}
      >
        元素工具栏
      </div>
      
      {toolGroups.map((group, groupIndex) => (
        <div key={groupIndex} style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: '#6b7280',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {group.name}
          </div>
          
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
            }}
          >
            {group.tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => createElement(tool.id)}
                style={{
                  padding: '12px 8px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#f97316';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <span style={{ fontSize: 24 }}>{tool.icon}</span>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {tool.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        点击工具创建元素
      </div>
    </div>
  );
};

