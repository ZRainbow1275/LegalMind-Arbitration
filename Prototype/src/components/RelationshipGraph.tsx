/**
 * LegalMind 法律工作台 - 人物关系图组件
 * 
 * 提供案件人物关系的可视化展示和交互编辑功能
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  User,
  Users,
  Building,
  Scale,
  UserCheck,
  UserX,
  Plus,
  Edit3,
  Trash2,


  Eye,
  EyeOff
} from 'lucide-react'

// ==================== 类型定义 ====================

interface Person {
  id: string
  name: string
  type: 'applicant' | 'respondent' | 'arbitrator' | 'lawyer' | 'witness' | 'expert' | 'other'
  organization?: string
  role?: string
  contactInfo?: {
    phone?: string
    email?: string
    address?: string
  }
  avatar?: string
  status: 'active' | 'inactive' | 'pending'
  metadata?: any
}

interface Relationship {
  id: string
  sourceId: string
  targetId: string
  type: 'represents' | 'opposes' | 'collaborates' | 'reports_to' | 'witnesses' | 'expert_for' | 'other'
  label?: string
  description?: string
  strength: 'weak' | 'medium' | 'strong'
  bidirectional?: boolean
  metadata?: any
}

interface RelationshipGraphProps {
  people: Person[]
  relationships: Relationship[]
  onPersonAdd?: (person: Omit<Person, 'id'>) => void
  onPersonEdit?: (personId: string, updates: Partial<Person>) => void
  onPersonDelete?: (personId: string) => void
  onRelationshipAdd?: (relationship: Omit<Relationship, 'id'>) => void
  onRelationshipEdit?: (relationshipId: string, updates: Partial<Relationship>) => void
  onRelationshipDelete?: (relationshipId: string) => void
  className?: string
  readOnly?: boolean
}

// ==================== 人员类型配置 ====================

const PERSON_TYPES = {
  applicant: {
    label: '申请人',
    icon: <UserCheck className="w-4 h-4" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  respondent: {
    label: '被申请人',
    icon: <UserX className="w-4 h-4" />,
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  arbitrator: {
    label: '仲裁员',
    icon: <Scale className="w-4 h-4" />,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  lawyer: {
    label: '律师',
    icon: <Building className="w-4 h-4" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  witness: {
    label: '证人',
    icon: <Eye className="w-4 h-4" />,
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  expert: {
    label: '专家',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  other: {
    label: '其他',
    icon: <User className="w-4 h-4" />,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  }
}

const RELATIONSHIP_TYPES = {
  represents: { label: '代理', color: 'text-blue-600', style: 'solid' },
  opposes: { label: '对立', color: 'text-red-600', style: 'dashed' },
  collaborates: { label: '协作', color: 'text-green-600', style: 'solid' },
  reports_to: { label: '汇报', color: 'text-purple-600', style: 'solid' },
  witnesses: { label: '作证', color: 'text-yellow-600', style: 'dotted' },
  expert_for: { label: '专家意见', color: 'text-indigo-600', style: 'solid' },
  other: { label: '其他', color: 'text-gray-600', style: 'solid' }
}

// ==================== 主组件 ====================

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  people,
  relationships,
  onPersonAdd,
  onPersonEdit,
  onPersonDelete,



  className = '',
  readOnly = false
}) => {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'list' | 'matrix'>('graph')
  const [showInactive, setShowInactive] = useState(true)
  const [personPositions, setPersonPositions] = useState<Record<string, { x: number; y: number }>>({})

  const svgRef = useRef<SVGSVGElement>(null)

  // ==================== 初始化人员位置 ====================

  useEffect(() => {
    if (people.length > 0 && Object.keys(personPositions).length === 0) {
      const positions: Record<string, { x: number; y: number }> = {}
      const centerX = 400
      const centerY = 300
      const radius = 150

      people.forEach((person, index) => {
        const angle = (index / people.length) * 2 * Math.PI
        positions[person.id] = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        }
      })

      setPersonPositions(positions)
    }
  }, [people, personPositions])

  // ==================== 事件处理 ====================

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person)
    setSelectedRelationship(null)
  }

  const handleRelationshipClick = (relationship: Relationship) => {
    setSelectedRelationship(relationship)
    setSelectedPerson(null)
  }

  const getPersonRelationships = (personId: string) => {
    return relationships.filter(rel =>
      rel.sourceId === personId || rel.targetId === personId
    )
  }

  // ==================== 渲染图形视图 ====================

  const renderGraphView = () => {
    const filteredPeople = showInactive ? people : people.filter(p => p.status === 'active')

    return (
      <div className="relative w-full h-96 border border-gray-200 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 800 600"
        >
          {/* 渲染关系连线 */}
          <g className="relationships">
            {relationships.map((relationship) => {
              const sourcePerson = people.find(p => p.id === relationship.sourceId)
              const targetPerson = people.find(p => p.id === relationship.targetId)
              const sourcePos = personPositions[relationship.sourceId]
              const targetPos = personPositions[relationship.targetId]

              if (!sourcePerson || !targetPerson || !sourcePos || !targetPos) return null

              const relationshipType = RELATIONSHIP_TYPES[relationship.type]
              const isSelected = selectedRelationship?.id === relationship.id

              return (
                <g key={relationship.id}>
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={isSelected ? '#f97316' : '#6b7280'}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={
                      relationshipType.style === 'dashed' ? '5,5' :
                        relationshipType.style === 'dotted' ? '2,2' : 'none'
                    }
                    className="cursor-pointer hover:stroke-orange-400 transition-colors"
                    onClick={() => handleRelationshipClick(relationship)}
                  />

                  {/* 关系标签 */}
                  <text
                    x={(sourcePos.x + targetPos.x) / 2}
                    y={(sourcePos.y + targetPos.y) / 2}
                    textAnchor="middle"
                    className={`text-xs fill-current ${relationshipType.color} cursor-pointer`}
                    onClick={() => handleRelationshipClick(relationship)}
                  >
                    {relationship.label || relationshipType.label}
                  </text>

                  {/* 箭头 */}
                  {!relationship.bidirectional && (
                    <polygon
                      points={`${targetPos.x - 5},${targetPos.y - 3} ${targetPos.x},${targetPos.y} ${targetPos.x - 5},${targetPos.y + 3}`}
                      fill={isSelected ? '#f97316' : '#6b7280'}
                      className="cursor-pointer"
                      onClick={() => handleRelationshipClick(relationship)}
                    />
                  )}
                </g>
              )
            })}
          </g>

          {/* 渲染人员节点 */}
          <g className="people">
            {filteredPeople.map((person) => {
              const position = personPositions[person.id]
              if (!position) return null

              const personType = PERSON_TYPES[person.type]
              const isSelected = selectedPerson?.id === person.id
              const relationshipCount = getPersonRelationships(person.id).length

              return (
                <g key={person.id}>
                  {/* 人员圆圈 */}
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={30}
                    fill={isSelected ? '#fed7aa' : personType.bgColor.replace('bg-', '#')}
                    stroke={isSelected ? '#f97316' : personType.color.replace('bg-', '#')}
                    strokeWidth={isSelected ? 3 : 2}
                    className="cursor-pointer hover:stroke-orange-400 transition-colors"
                    onClick={() => handlePersonClick(person)}
                  />

                  {/* 人员图标 */}
                  <foreignObject
                    x={position.x - 8}
                    y={position.y - 8}
                    width={16}
                    height={16}
                    className="pointer-events-none"
                  >
                    <div className={`text-white ${personType.color}`}>
                      {personType.icon}
                    </div>
                  </foreignObject>

                  {/* 人员姓名 */}
                  <text
                    x={position.x}
                    y={position.y + 45}
                    textAnchor="middle"
                    className="text-sm fill-current text-gray-900 font-medium cursor-pointer"
                    onClick={() => handlePersonClick(person)}
                  >
                    {person.name}
                  </text>

                  {/* 关系数量指示器 */}
                  {relationshipCount > 0 && (
                    <circle
                      cx={position.x + 20}
                      cy={position.y - 20}
                      r={8}
                      fill="#f97316"
                      className="cursor-pointer"
                      onClick={() => handlePersonClick(person)}
                    />
                  )}
                  {relationshipCount > 0 && (
                    <text
                      x={position.x + 20}
                      y={position.y - 16}
                      textAnchor="middle"
                      className="text-xs fill-current text-white font-bold cursor-pointer"
                      onClick={() => handlePersonClick(person)}
                    >
                      {relationshipCount}
                    </text>
                  )}

                  {/* 状态指示器 */}
                  {person.status !== 'active' && (
                    <circle
                      cx={position.x - 20}
                      cy={position.y - 20}
                      r={6}
                      fill={person.status === 'pending' ? '#fbbf24' : '#6b7280'}
                    />
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* 添加人员按钮 */}
        {!readOnly && (
          <button
            className="absolute bottom-4 right-4 w-12 h-12 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center"
            onClick={() => onPersonAdd?.({
              name: '新人员',
              type: 'other',
              status: 'active'
            })}
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>
    )
  }

  // ==================== 渲染列表视图 ====================

  const renderListView = () => {
    const filteredPeople = showInactive ? people : people.filter(p => p.status === 'active')

    return (
      <div className="space-y-4">
        {filteredPeople.map((person) => {
          const personType = PERSON_TYPES[person.type]
          const relationshipCount = getPersonRelationships(person.id).length
          const isSelected = selectedPerson?.id === person.id

          return (
            <div
              key={person.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-orange-500 border-orange-200' : 'border-gray-200'
                }`}
              onClick={() => handlePersonClick(person)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${personType.color} text-white`}>
                    {personType.icon}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">{person.name}</h4>
                    <p className="text-sm text-gray-600">{personType.label}</p>
                    {person.organization && (
                      <p className="text-xs text-gray-500">{person.organization}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {relationshipCount} 个关系
                  </span>

                  <div className={`w-2 h-2 rounded-full ${person.status === 'active' ? 'bg-green-500' :
                    person.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />

                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onPersonEdit?.(person.id, {})
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onPersonDelete?.(person.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 联系信息 */}
              {person.contactInfo && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                    {person.contactInfo.phone && (
                      <div>电话: {person.contactInfo.phone}</div>
                    )}
                    {person.contactInfo.email && (
                      <div>邮箱: {person.contactInfo.email}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ==================== 渲染 ====================

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">人物关系图</h3>
          <span className="text-sm text-gray-500">
            {people.length} 个人员，{relationships.length} 个关系
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 显示控制 */}
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${showInactive ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {showInactive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            显示非活跃
          </button>

          {/* 视图切换 */}
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'graph'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              关系图
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm transition-colors ${viewMode === 'list'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              列表
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {viewMode === 'graph' && renderGraphView()}
        {viewMode === 'list' && renderListView()}

        {people.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无人员信息</h4>
            <p className="text-gray-500 mb-4">开始添加案件相关人员</p>
            {!readOnly && (
              <button
                onClick={() => onPersonAdd?.({
                  name: '新人员',
                  type: 'other',
                  status: 'active'
                })}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                添加第一个人员
              </button>
            )}
          </div>
        )}
      </div>

      {/* 详情面板 */}
      {selectedPerson && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${PERSON_TYPES[selectedPerson.type].color} text-white`}>
                {PERSON_TYPES[selectedPerson.type].icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{selectedPerson.name}</h4>
                <p className="text-sm text-gray-600">{PERSON_TYPES[selectedPerson.type].label}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedPerson(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {selectedPerson.organization && (
              <div>
                <span className="text-gray-500">组织：</span>
                <span className="text-gray-900">{selectedPerson.organization}</span>
              </div>
            )}
            {selectedPerson.role && (
              <div>
                <span className="text-gray-500">角色：</span>
                <span className="text-gray-900">{selectedPerson.role}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">状态：</span>
              <span className={`${selectedPerson.status === 'active' ? 'text-green-600' :
                selectedPerson.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                {selectedPerson.status === 'active' ? '活跃' :
                  selectedPerson.status === 'pending' ? '待确认' : '非活跃'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">关系数：</span>
              <span className="text-gray-900">{getPersonRelationships(selectedPerson.id).length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelationshipGraph
