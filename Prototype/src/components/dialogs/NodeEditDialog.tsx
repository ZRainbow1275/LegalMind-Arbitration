import React, { useState, useEffect } from 'react';
import { LegalNode, LegalNodeTypes } from '../../plugins/legal-nodes/types';

interface NodeEditDialogProps {
  node: LegalNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: LegalNode) => void;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  node,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node });
    }
  }, [node]);

  if (!isOpen || !node) return null;



  const handleNestedInputChange = (parentField: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(formData as LegalNode);
    onClose();
  };

  const renderCaseFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          案件编号
        </label>
        <input
          type="text"
          value={formData.caseInfo?.caseNumber || ''}
          onChange={(e) => handleNestedInputChange('caseInfo', 'caseNumber', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          案件类型
        </label>
        <select
          value={formData.caseInfo?.caseType || ''}
          onChange={(e) => handleNestedInputChange('caseInfo', 'caseType', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="合同纠纷">合同纠纷</option>
          <option value="劳动争议">劳动争议</option>
          <option value="知识产权">知识产权</option>
          <option value="公司纠纷">公司纠纷</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          案件状态
        </label>
        <select
          value={formData.caseInfo?.status || ''}
          onChange={(e) => handleNestedInputChange('caseInfo', 'status', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="pending">待处理</option>
          <option value="active">进行中</option>
          <option value="closed">已结案</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          优先级
        </label>
        <select
          value={formData.caseInfo?.priority || ''}
          onChange={(e) => handleNestedInputChange('caseInfo', 'priority', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </div>
    </div>
  );

  const renderPersonFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          姓名
        </label>
        <input
          type="text"
          value={formData.personInfo?.name || ''}
          onChange={(e) => handleNestedInputChange('personInfo', 'name', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          角色
        </label>
        <select
          value={formData.personInfo?.role || ''}
          onChange={(e) => handleNestedInputChange('personInfo', 'role', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="plaintiff">原告</option>
          <option value="defendant">被告</option>
          <option value="witness">证人</option>
          <option value="lawyer">律师</option>
          <option value="judge">法官</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          组织机构
        </label>
        <input
          type="text"
          value={formData.personInfo?.organization || ''}
          onChange={(e) => handleNestedInputChange('personInfo', 'organization', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
    </div>
  );

  const renderDocumentFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          文档标题
        </label>
        <input
          type="text"
          value={formData.documentInfo?.title || ''}
          onChange={(e) => handleNestedInputChange('documentInfo', 'title', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          文档类型
        </label>
        <select
          value={formData.documentInfo?.type || ''}
          onChange={(e) => handleNestedInputChange('documentInfo', 'type', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="contract">合同</option>
          <option value="evidence">证据</option>
          <option value="pleading">诉状</option>
          <option value="judgment">判决书</option>
          <option value="correspondence">函件</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
          文档状态
        </label>
        <select
          value={formData.documentInfo?.status || ''}
          onChange={(e) => handleNestedInputChange('documentInfo', 'status', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="draft">草稿</option>
          <option value="review">审核中</option>
          <option value="approved">已批准</option>
          <option value="filed">已归档</option>
        </select>
      </div>
    </div>
  );

  const renderFields = () => {
    switch (node.type) {
      case LegalNodeTypes.case:
        return renderCaseFields();
      case LegalNodeTypes.person:
        return renderPersonFields();
      case LegalNodeTypes.document:
        return renderDocumentFields();
      default:
        return (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            该节点类型暂不支持编辑
          </div>
        );
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        width: '400px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid #eee'
        }}>
          <h3 style={{
            margin: 0,
            color: '#FF6B35',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            编辑节点
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#999',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {renderFields()}

        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '12px',
          borderTop: '1px solid #eee'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              color: '#666',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              backgroundColor: '#FF6B35',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
