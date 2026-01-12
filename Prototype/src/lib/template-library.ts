/**
 * 模板库
 * 
 * 提供预定义的业务模板
 */

import type { CanvasData } from '../types/canvas-elements';
import type { BusinessMode } from '../types/embedding-interface';
import { ElementFactory } from './element-factory';

// ==================== 模板接口 ====================

export interface Template {
  id: string;
  name: string;
  description: string;
  mode: BusinessMode;
  thumbnail?: string;
  tags: string[];
  canvasData: CanvasData;
}

// ==================== 模板库类 ====================

export class TemplateLibrary {
  private static templates: Map<string, Template> = new Map();
  
  // ==================== 初始化 ====================
  
  static initialize() {
    // 注册所有预定义模板
    this.registerTemplate(this.createHearingTemplate());
    this.registerTemplate(this.createMediationTemplate());
    this.registerTemplate(this.createDocumentTemplate());
    this.registerTemplate(this.createSimpleHearingTemplate());
    this.registerTemplate(this.createComplexMediationTemplate());
  }
  
  // ==================== 模板管理 ====================
  
  static registerTemplate(template: Template) {
    this.templates.set(template.id, template);
  }
  
  static getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }
  
  static getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }
  
  static getTemplatesByMode(mode: BusinessMode): Template[] {
    return Array.from(this.templates.values()).filter(t => t.mode === mode);
  }
  
  static searchTemplates(query: string): Template[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
  
  // ==================== 预定义模板 ====================
  
  /**
   * 标准庭审模板
   */
  private static createHearingTemplate(): Template {
    const elements: Record<string, any> = {};
    const rootElements: string[] = [];
    
    // 案件节点
    const caseNode = ElementFactory.createLegalNode(
      { x: 400, y: 50 },
      'case',
      '案件名称'
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);
    
    // 原告
    const plaintiff = ElementFactory.createLegalNode(
      { x: 200, y: 200 },
      'party',
      '原告'
    );
    elements[plaintiff.id] = plaintiff;
    rootElements.push(plaintiff.id);
    
    // 被告
    const defendant = ElementFactory.createLegalNode(
      { x: 600, y: 200 },
      'party',
      '被告'
    );
    elements[defendant.id] = defendant;
    rootElements.push(defendant.id);
    
    // 证据区域
    const evidenceFrame = ElementFactory.createFrame(
      { x: 100, y: 350 },
      { width: 700, height: 200 },
      '证据区域'
    );
    elements[evidenceFrame.id] = evidenceFrame;
    rootElements.push(evidenceFrame.id);
    
    // 时间线区域
    const timelineFrame = ElementFactory.createFrame(
      { x: 100, y: 600 },
      { width: 700, height: 150 },
      '庭审时间线'
    );
    elements[timelineFrame.id] = timelineFrame;
    rootElements.push(timelineFrame.id);
    
    return {
      id: 'hearing-standard',
      name: '标准庭审模板',
      description: '包含案件、当事人、证据和时间线的标准庭审可视化模板',
      mode: 'hearing',
      tags: ['hearing', 'standard', 'litigation'],
      canvasData: {
        id: 'template-hearing-standard',
        name: '标准庭审模板',
        elements,
        rootElements,
        viewport: { x: 0, y: 0, zoom: 1 },
        background: {
          color: '#ffffff',
          grid: { enabled: true, size: 20, color: '#e5e7eb' },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          tags: ['template', 'hearing'],
        },
      },
    };
  }
  
  /**
   * 标准调解模板
   */
  private static createMediationTemplate(): Template {
    const elements: Record<string, any> = {};
    const rootElements: string[] = [];
    
    // 案件节点
    const caseNode = ElementFactory.createLegalNode(
      { x: 400, y: 50 },
      'case',
      '调解案件'
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);
    
    // 当事方A
    const partyA = ElementFactory.createLegalNode(
      { x: 200, y: 200 },
      'party',
      '当事方A'
    );
    elements[partyA.id] = partyA;
    rootElements.push(partyA.id);
    
    // 当事方B
    const partyB = ElementFactory.createLegalNode(
      { x: 600, y: 200 },
      'party',
      '当事方B'
    );
    elements[partyB.id] = partyB;
    rootElements.push(partyB.id);
    
    // 争议焦点区域
    const disputeFrame = ElementFactory.createFrame(
      { x: 100, y: 350 },
      { width: 700, height: 200 },
      '争议焦点'
    );
    elements[disputeFrame.id] = disputeFrame;
    rootElements.push(disputeFrame.id);
    
    // 调解方案区域
    const proposalFrame = ElementFactory.createFrame(
      { x: 100, y: 600 },
      { width: 700, height: 200 },
      '调解方案'
    );
    elements[proposalFrame.id] = proposalFrame;
    rootElements.push(proposalFrame.id);
    
    return {
      id: 'mediation-standard',
      name: '标准调解模板',
      description: '包含当事方、争议焦点和调解方案的标准调解可视化模板',
      mode: 'mediation',
      tags: ['mediation', 'standard', 'dispute'],
      canvasData: {
        id: 'template-mediation-standard',
        name: '标准调解模板',
        elements,
        rootElements,
        viewport: { x: 0, y: 0, zoom: 1 },
        background: {
          color: '#ffffff',
          grid: { enabled: true, size: 20, color: '#e5e7eb' },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          tags: ['template', 'mediation'],
        },
      },
    };
  }
  
  /**
   * 文书生成模板
   */
  private static createDocumentTemplate(): Template {
    const elements: Record<string, any> = {};
    const rootElements: string[] = [];
    
    // 文书标题
    const titleText = ElementFactory.createText(
      { x: 300, y: 50 },
      '文书标题',
      { size: { width: 400, height: 60 } }
    );
    elements[titleText.id] = titleText;
    rootElements.push(titleText.id);
    
    // 章节框架
    const sections = [
      { title: '一、案件基本情况', y: 150 },
      { title: '二、当事人主张', y: 300 },
      { title: '三、事实与证据', y: 450 },
      { title: '四、法律适用', y: 600 },
      { title: '五、裁决结果', y: 750 },
    ];
    
    sections.forEach(section => {
      const frame = ElementFactory.createFrame(
        { x: 100, y: section.y },
        { width: 700, height: 120 },
        section.title
      );
      elements[frame.id] = frame;
      rootElements.push(frame.id);
    });
    
    return {
      id: 'document-standard',
      name: '标准文书模板',
      description: '包含标准章节结构的法律文书生成模板',
      mode: 'document',
      tags: ['document', 'standard', 'award'],
      canvasData: {
        id: 'template-document-standard',
        name: '标准文书模板',
        elements,
        rootElements,
        viewport: { x: 0, y: 0, zoom: 0.8 },
        background: {
          color: '#ffffff',
          grid: { enabled: false, size: 20, color: '#e5e7eb' },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          tags: ['template', 'document'],
        },
      },
    };
  }
  
  /**
   * 简化庭审模板
   */
  private static createSimpleHearingTemplate(): Template {
    const elements: Record<string, any> = {};
    const rootElements: string[] = [];
    
    const caseNode = ElementFactory.createLegalNode(
      { x: 400, y: 200 },
      'case',
      '案件'
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);
    
    return {
      id: 'hearing-simple',
      name: '简化庭审模板',
      description: '最简单的庭审模板，只包含案件节点',
      mode: 'hearing',
      tags: ['hearing', 'simple', 'minimal'],
      canvasData: {
        id: 'template-hearing-simple',
        name: '简化庭审模板',
        elements,
        rootElements,
        viewport: { x: 0, y: 0, zoom: 1 },
        background: {
          color: '#ffffff',
          grid: { enabled: true, size: 20, color: '#e5e7eb' },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          tags: ['template', 'hearing', 'simple'],
        },
      },
    };
  }
  
  /**
   * 复杂调解模板
   */
  private static createComplexMediationTemplate(): Template {
    const elements: Record<string, any> = {};
    const rootElements: string[] = [];
    
    // 案件节点
    const caseNode = ElementFactory.createLegalNode(
      { x: 500, y: 50 },
      'case',
      '复杂调解案件'
    );
    elements[caseNode.id] = caseNode;
    rootElements.push(caseNode.id);
    
    // 多个当事方
    for (let i = 0; i < 4; i++) {
      const party = ElementFactory.createLegalNode(
        { x: 200 + i * 200, y: 200 },
        'party',
        `当事方${i + 1}`
      );
      elements[party.id] = party;
      rootElements.push(party.id);
    }
    
    // 多个争议焦点
    for (let i = 0; i < 3; i++) {
      const dispute = ElementFactory.createLegalNode(
        { x: 300 + i * 200, y: 400 },
        'claim',
        `争议${i + 1}`
      );
      elements[dispute.id] = dispute;
      rootElements.push(dispute.id);
    }
    
    return {
      id: 'mediation-complex',
      name: '复杂调解模板',
      description: '适用于多方当事人、多个争议焦点的复杂调解案件',
      mode: 'mediation',
      tags: ['mediation', 'complex', 'multi-party'],
      canvasData: {
        id: 'template-mediation-complex',
        name: '复杂调解模板',
        elements,
        rootElements,
        viewport: { x: 0, y: 0, zoom: 0.8 },
        background: {
          color: '#ffffff',
          grid: { enabled: true, size: 20, color: '#e5e7eb' },
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          tags: ['template', 'mediation', 'complex'],
        },
      },
    };
  }
}

// 自动初始化
TemplateLibrary.initialize();

