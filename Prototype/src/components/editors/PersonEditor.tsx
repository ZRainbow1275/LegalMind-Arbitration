
import React, { useState } from 'react';
import { Button } from '../ui/button';

import {
  Users,
  Phone,
  Mail,
  MapPin,
  User,
  Scale,
  FileText,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { LegalNode } from '../DrawnixLegalWorkspace';
import { EditorModal } from '../common/EditorModal';

import { PersonMetadata } from '../workspace/types';

interface PersonEditorProps {
  node: LegalNode;
  onSave: (updates: Partial<LegalNode>) => void;
  onClose: () => void;
}

interface ContactInfo {
  type: 'phone' | 'email' | 'address' | 'fax';
  value: string;
  label: string;
}


export const PersonEditor: React.FC<PersonEditorProps> = ({
  node,
  onSave,
  onClose
}) => {
  const metadata = node.data.metadata as PersonMetadata;

  const [formData, setFormData] = useState({
    title: node.data.title,
    description: node.data.description,
    status: node.data.status,
    personType: metadata?.personType || 'applicant',
    entityType: metadata?.entityType || 'individual',
    fullName: metadata?.fullName || '',
    idNumber: metadata?.idNumber || '',
    companyName: metadata?.companyName || '',
    registrationNumber: metadata?.registrationNumber || '',
    legalRepresentative: metadata?.legalRepresentative || '',
    contactInfo: metadata?.contactInfo || [],
    address: metadata?.address || '',
    role: metadata?.role || '',
    interests: metadata?.interests || '',
    claims: metadata?.claims || '',
    defenses: metadata?.defenses || ''
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'contact' | 'legal' | 'claims'>('basic');
  const [newContact, setNewContact] = useState<ContactInfo>({ type: 'phone', value: '', label: '' });

  const handleSave = () => {
    const updates: Partial<LegalNode> = {
      data: {
        ...node.data,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        metadata: {
          ...node.data.metadata,
          personType: formData.personType,
          entityType: formData.entityType,
          fullName: formData.fullName,
          idNumber: formData.idNumber,
          companyName: formData.companyName,
          registrationNumber: formData.registrationNumber,
          legalRepresentative: formData.legalRepresentative,
          contactInfo: formData.contactInfo,
          address: formData.address,
          role: formData.role,
          interests: formData.interests,
          claims: formData.claims,
          defenses: formData.defenses
        }
      }
    };
    onSave(updates);
    onClose();
  };

  const addContact = () => {
    if (newContact.value && newContact.label) {
      setFormData(prev => ({
        ...prev,
        contactInfo: [...prev.contactInfo, { ...newContact }]
      }));
      setNewContact({ type: 'phone', value: '', label: '' });
    }
  };

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: prev.contactInfo.filter((_, i) => i !== index)
    }));
  };

  const personTypeLabels = {
    applicant: '申请人',
    respondent: '被申请人',
    third_party: '第三人',
    witness: '证人',
    expert: '专家',
    arbitrator: '仲裁员'
  };

  const entityTypeLabels = {
    individual: '自然人',
    company: '公司',
    organization: '组织',
    government: '政府机构'
  };

  const contactTypeIcons = {
    phone: Phone,
    email: Mail,
    address: MapPin,
    fax: FileText
  };

  return (
    <EditorModal
      isOpen={true}
      title="当事人编辑器"
      subtitle={`ID: ${node.id} `}
      icon={<Users className="w-5 h-5 text-white" />}
      iconBgColor="bg-green-500"
      onClose={onClose}
      footer={
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            最后修改: {new Date().toLocaleString('zh-CN')}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      }
    >
      {/* 标签页导航 */}
      <div className="flex space-x-1 mb-4">
        {[
          { key: 'basic', label: '基本信息', icon: User },
          { key: 'contact', label: '联系方式', icon: Phone },
          { key: 'legal', label: '法律地位', icon: Scale },
          { key: 'claims', label: '主张与抗辩', icon: FileText }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeSection === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSection(key as any)}
            className="flex items-center space-x-2"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* 内容区域 */}
      <div>
        {activeSection === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">显示名称</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入显示名称"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">当事人类型</label>
                <select
                  value={formData.personType}
                  onChange={(e) => setFormData(prev => ({ ...prev, personType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(personTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">主体类型</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => setFormData(prev => ({ ...prev, entityType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(entityTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.entityType === 'individual' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">姓名</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="输入真实姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">身份证号</label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="输入身份证号码"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">公司名称</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="输入公司全称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">注册号/统一社会信用代码</label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="输入注册号"
                  />
                </div>
              </div>
            )}

            {formData.entityType !== 'individual' && (
              <div>
                <label className="block text-sm font-medium mb-2">法定代表人</label>
                <input
                  type="text"
                  value={formData.legalRepresentative}
                  onChange={(e) => setFormData(prev => ({ ...prev, legalRepresentative: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="输入法定代表人姓名"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">地址</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入详细地址"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="输入描述信息"
              />
            </div>
          </div>
        )}

        {activeSection === 'contact' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">联系方式</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addContact}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>添加联系方式</span>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-md">
              <select
                value={newContact.type}
                onChange={(e) => setNewContact(prev => ({ ...prev, type: e.target.value as any }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="phone">电话</option>
                <option value="email">邮箱</option>
                <option value="address">地址</option>
                <option value="fax">传真</option>
              </select>
              <input
                type="text"
                value={newContact.label}
                onChange={(e) => setNewContact(prev => ({ ...prev, label: e.target.value }))}
                placeholder="标签"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                value={newContact.value}
                onChange={(e) => setNewContact(prev => ({ ...prev, value: e.target.value }))}
                placeholder="联系方式"
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="space-y-2">
              {formData.contactInfo.map((contact, index) => {
                const IconComponent = contactTypeIcons[contact.type];
                return (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{contact.label}</div>
                        <div className="text-sm text-gray-500">{contact.value}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSection === 'legal' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">在案件中的角色</label>
              <textarea
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="描述在本案中的具体角色和地位..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">利益关系</label>
              <textarea
                value={formData.interests}
                onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="描述与案件相关的利益关系..."
              />
            </div>
          </div>
        )}

        {activeSection === 'claims' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">主要主张</label>
              <textarea
                value={formData.claims}
                onChange={(e) => setFormData(prev => ({ ...prev, claims: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="列出主要的法律主张和诉求..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">抗辩理由</label>
              <textarea
                value={formData.defenses}
                onChange={(e) => setFormData(prev => ({ ...prev, defenses: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="列出主要的抗辩理由和依据..."
              />
            </div>
          </div>
        )}
      </div>
    </EditorModal>
  );
};
