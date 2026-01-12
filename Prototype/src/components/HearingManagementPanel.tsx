import React, { useState } from 'react';

interface HearingData {
  id: string;
  title: string;
  caseId: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  type: 'ONLINE' | 'OFFLINE';
  participants: string[];
  duration: number;
  description?: string;
}

interface HearingManagementPanelProps {
  hearing?: HearingData;
  onClose: () => void;
  onSave: (hearing: HearingData) => void;
}

export const HearingManagementPanel: React.FC<HearingManagementPanelProps> = ({
  hearing,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<HearingData>(
    hearing || {
      id: `hearing-${Date.now()}`,
      title: '新庭审',
      caseId: '',
      scheduledAt: new Date().toISOString().slice(0, 16),
      status: 'SCHEDULED',
      type: 'ONLINE',
      participants: [],
      duration: 120,
      description: ''
    }
  );

  const [newParticipant, setNewParticipant] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const addParticipant = () => {
    if (newParticipant.trim() && !formData.participants.includes(newParticipant.trim())) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, newParticipant.trim()]
      }));
      setNewParticipant('');
    }
  };

  const removeParticipant = (participant: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== participant)
    }));
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
        width: '600px',
        maxHeight: '80vh',
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
            🏛️ 庭审管理
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 基本信息 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              庭审标题
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                庭审时间
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                预计时长（分钟）
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                min="30"
                max="480"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                庭审类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'ONLINE' | 'OFFLINE' }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="ONLINE">🌐 在线庭审</option>
                <option value="OFFLINE">🏢 线下庭审</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="SCHEDULED">📅 已安排</option>
                <option value="IN_PROGRESS">🔄 进行中</option>
                <option value="COMPLETED">✅ 已完成</option>
                <option value="CANCELLED">❌ 已取消</option>
              </select>
            </div>
          </div>

          {/* 参与者管理 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              参与者管理
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder="输入参与者姓名"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
              />
              <button
                type="button"
                onClick={addParticipant}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                添加
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {formData.participants.map((participant, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '16px',
                    fontSize: '12px'
                  }}
                >
                  <span>👤 {participant}</span>
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      fontSize: '14px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              庭审描述
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="输入庭审相关说明..."
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
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f5f5f5',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                backgroundColor: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              保存庭审
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
