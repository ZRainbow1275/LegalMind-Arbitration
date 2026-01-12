import React, { useState } from 'react';

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'contract' | 'pleading' | 'motion' | 'agreement' | 'notice' | 'judgment';
  description: string;
  fields: {
    id: string;
    label: string;
    type: 'text' | 'date' | 'number' | 'select' | 'textarea';
    required: boolean;
    options?: string[];
    placeholder?: string;
  }[];
  template: string;
}

interface SmartDocumentGeneratorProps {
  onGenerate: (document: any) => void;
  onClose: () => void;
  caseData?: any;
}

export const SmartDocumentGenerator: React.FC<SmartDocumentGeneratorProps> = ({
  onGenerate,
  onClose,

}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');

  const templates: DocumentTemplate[] = [
    {
      id: 'arbitration-application',
      name: '仲裁申请书',
      type: 'pleading',
      description: '标准仲裁申请书模板，适用于商事争议',
      fields: [
        { id: 'applicant', label: '申请人', type: 'text', required: true, placeholder: '请输入申请人姓名/公司名称' },
        { id: 'respondent', label: '被申请人', type: 'text', required: true, placeholder: '请输入被申请人姓名/公司名称' },
        { id: 'disputeAmount', label: '争议金额', type: 'number', required: true, placeholder: '请输入争议金额（元）' },
        { id: 'disputeSubject', label: '争议事项', type: 'textarea', required: true, placeholder: '请详细描述争议的具体事项' },
        { id: 'factualBasis', label: '事实依据', type: 'textarea', required: true, placeholder: '请详细说明事实依据' },
        { id: 'legalBasis', label: '法律依据', type: 'textarea', required: true, placeholder: '请列出相关法律条文' },
        { id: 'arbitrationRequest', label: '仲裁请求', type: 'textarea', required: true, placeholder: '请明确仲裁请求' }
      ],
      template: `仲裁申请书

申请人：{{applicant}}
被申请人：{{respondent}}

争议金额：{{disputeAmount}}元

一、争议事项
{{disputeSubject}}

二、事实依据
{{factualBasis}}

三、法律依据
{{legalBasis}}

四、仲裁请求
{{arbitrationRequest}}

此致
[仲裁委员会名称]

申请人：{{applicant}}
日期：{{currentDate}}`
    },
    {
      id: 'mediation-agreement',
      name: '调解协议书',
      type: 'agreement',
      description: '调解协议书模板，用于记录调解达成的协议',
      fields: [
        { id: 'party1', label: '甲方', type: 'text', required: true, placeholder: '甲方姓名/公司名称' },
        { id: 'party2', label: '乙方', type: 'text', required: true, placeholder: '乙方姓名/公司名称' },
        { id: 'mediator', label: '调解员', type: 'text', required: true, placeholder: '调解员姓名' },
        { id: 'disputeDescription', label: '争议描述', type: 'textarea', required: true, placeholder: '简要描述争议内容' },
        { id: 'agreementTerms', label: '协议条款', type: 'textarea', required: true, placeholder: '详细列出协议条款' },
        { id: 'paymentAmount', label: '支付金额', type: 'number', required: false, placeholder: '如涉及金钱给付，请填写金额' },
        { id: 'paymentDeadline', label: '履行期限', type: 'date', required: false, placeholder: '协议履行的截止日期' }
      ],
      template: `调解协议书

甲方：{{party1}}
乙方：{{party2}}
调解员：{{mediator}}

经调解员{{mediator}}主持调解，甲乙双方就以下争议：
{{disputeDescription}}

达成如下协议：

{{agreementTerms}}

{{#if paymentAmount}}
支付金额：{{paymentAmount}}元
{{/if}}

{{#if paymentDeadline}}
履行期限：{{paymentDeadline}}
{{/if}}

本协议自双方签字之日起生效。

甲方：{{party1}}     乙方：{{party2}}
日期：{{currentDate}}   日期：{{currentDate}}`
    },
    {
      id: 'hearing-notice',
      name: '庭审通知书',
      type: 'notice',
      description: '庭审通知书模板，用于通知当事人参加庭审',
      fields: [
        { id: 'caseNumber', label: '案件编号', type: 'text', required: true, placeholder: '案件编号' },
        { id: 'parties', label: '当事人', type: 'textarea', required: true, placeholder: '列出所有当事人' },
        { id: 'hearingDate', label: '庭审日期', type: 'date', required: true },
        { id: 'hearingTime', label: '庭审时间', type: 'text', required: true, placeholder: '例如：上午9:00' },
        { id: 'hearingLocation', label: '庭审地点', type: 'text', required: true, placeholder: '庭审地点或在线链接' },
        { id: 'hearingType', label: '庭审类型', type: 'select', required: true, options: ['在线庭审', '现场庭审'] },
        { id: 'requirements', label: '特殊要求', type: 'textarea', required: false, placeholder: '如有特殊要求请说明' }
      ],
      template: `庭审通知书

案件编号：{{caseNumber}}

当事人：
{{parties}}

兹定于{{hearingDate}} {{hearingTime}}就上述案件进行{{hearingType}}。

{{#if hearingType === '在线庭审'}}
庭审链接：{{hearingLocation}}
{{else}}
庭审地点：{{hearingLocation}}
{{/if}}

{{#if requirements}}
特殊要求：
{{requirements}}
{{/if}}

请各方当事人准时参加庭审。

[仲裁委员会名称]
日期：{{currentDate}}`
    }
  ];

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setGeneratedContent('');
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const generateDocument = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);

    // 模拟AI文档生成过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 简单的模板替换逻辑
    let content = selectedTemplate.template;

    // 替换表单数据
    Object.entries(formData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value || '');
    });

    // 添加当前日期
    const currentDate = new Date().toLocaleDateString('zh-CN');
    content = content.replace(/{{currentDate}}/g, currentDate);

    // 处理条件逻辑（简化版）
    content = content.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (_match, condition, block) => {
      return formData[condition] ? block : '';
    });

    setGeneratedContent(content);
    setIsGenerating(false);
  };

  const handleSave = () => {
    if (generatedContent && selectedTemplate) {
      const document = {
        id: `doc-${Date.now()}`,
        title: selectedTemplate.name,
        type: selectedTemplate.type,
        content: generatedContent,
        createdAt: new Date().toISOString(),
        templateId: selectedTemplate.id,
        formData
      };
      onGenerate(document);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#FF6B35',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            🤖 AI智能文档生成器
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {/* 左侧：模板选择 */}
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '16px', color: '#333' }}>选择文档模板</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  style={{
                    padding: '16px',
                    border: selectedTemplate?.id === template.id ? '2px solid #FF6B35' : '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedTemplate?.id === template.id ? '#fff5f0' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {template.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：表单填写和预览 */}
          {selectedTemplate && (
            <div style={{ flex: 2 }}>
              <h3 style={{ marginBottom: '16px', color: '#333' }}>填写文档信息</h3>

              {/* 表单字段 */}
              <div style={{ marginBottom: '20px', maxHeight: '300px', overflow: 'auto' }}>
                {selectedTemplate.fields.map(field => (
                  <div key={field.id} style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '4px',
                      fontWeight: '500',
                      color: field.required ? '#FF6B35' : '#333'
                    }}>
                      {field.label} {field.required && '*'}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          minHeight: '80px',
                          resize: 'vertical'
                        }}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">请选择...</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* 生成按钮 */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={generateDocument}
                  disabled={isGenerating}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isGenerating ? '#ccc' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {isGenerating ? '🤖 AI生成中...' : '🚀 生成文档'}
                </button>
              </div>

              {/* 文档预览 */}
              {generatedContent && (
                <div>
                  <h4 style={{ marginBottom: '12px', color: '#333' }}>文档预览</h4>
                  <div style={{
                    padding: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: '#f9f9f9',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {generatedContent}
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setGeneratedContent('')}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      重新生成
                    </button>
                    <button
                      onClick={handleSave}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      保存文档
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
