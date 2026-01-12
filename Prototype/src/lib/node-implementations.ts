/**
 * LegalMind 法律工作台 - 具体节点实现
 * 
 * 实现6种核心节点类型的具体渲染和交互逻辑：
 * 1. CaseInfoNode - 案件信息节点
 * 2. PersonNode - 人物关系节点  
 * 3. DocumentNode - 文档管理节点
 * 4. TimelineNode - 时间轴节点
 * 5. ProcessNode - 流程模板节点
 * 6. AIAssistantNode - AI助手节点
 */

import {
  BaseNode,
  NodeStyle,
  CaseInfoNodeData,
  PersonNodeData,
  DocumentNodeData,
  TimelineNodeData,
  ProcessNodeData,
  AIAssistantNodeData,
  NodeFactory
} from './node-system'
import { ViewportState } from './canvas-engine'

// ==================== 案件信息节点 ====================

export class CaseInfoNode extends BaseNode {
  constructor(data: CaseInfoNodeData) {
    super(data)
  }

  getDefaultStyle(): NodeStyle {
    return {
      backgroundColor: '#3B82F6',
      borderColor: '#1E40AF',
      borderWidth: 2,
      borderRadius: 12,
      textColor: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      opacity: 1,
      shadow: {
        enabled: true,
        color: 'rgba(59, 130, 246, 0.3)',
        blur: 8,
        offsetX: 0,
        offsetY: 4
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const data = this.data as CaseInfoNodeData
    const bounds = this.bounds
    const style = this.style

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    // 绘制阴影
    if (style.shadow.enabled) {
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    }

    // 绘制背景
    ctx.fillStyle = style.backgroundColor
    ctx.globalAlpha = style.opacity
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius)
    ctx.fill()

    // 绘制边框
    if (style.borderWidth > 0) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'

    // 绘制图标
    ctx.fillStyle = style.textColor
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('⚖️', bounds.x + 30, bounds.y + 35)

    // 绘制案件号
    ctx.fillStyle = style.textColor
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(data.metadata.caseNumber, bounds.x + 20, bounds.y + 30)

    // 绘制案件标题
    ctx.font = `normal ${style.fontSize}px Arial`
    const title = this.truncateText(ctx, data.metadata.caseTitle || data.title, bounds.width - 40)
    ctx.fillText(title, bounds.x + 20, bounds.y + 50)

    // 绘制当事人信息
    ctx.font = `normal ${style.fontSize - 2}px Arial`
    ctx.fillStyle = '#6B7280'
    const applicant = data.metadata.parties.applicant
    const respondent = data.metadata.parties.respondent
    const partiesText = `${applicant} vs ${respondent}`
    const truncatedParties = this.truncateText(ctx, partiesText, bounds.width - 40)
    ctx.fillText(truncatedParties, bounds.x + 20, bounds.y + 70)

    // 绘制选中状态
    if (this.isSelected) {
      this.drawSelectionBorder(ctx, bounds)
    }

    ctx.restore()
  }

  getContextMenuItems() {
    return [
      { label: '编辑案件', action: 'edit-case', icon: '✏️' },
      { label: '查看详情', action: 'view-details', icon: '👁️' },
      { label: '关联文档', action: 'link-document', icon: '🔗' }
    ]
  }



  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  private drawSelectionBorder(ctx: CanvasRenderingContext2D, bounds: any) {
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    this.roundRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, this.style.borderRadius + 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// ==================== 人物关系节点 ====================

export class PersonNode extends BaseNode {
  constructor(data: PersonNodeData) {
    super(data)
  }

  getDefaultStyle(): NodeStyle {
    return {
      backgroundColor: '#10B981',
      borderColor: '#059669',
      borderWidth: 2,
      borderRadius: 50, // 圆形节点
      textColor: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'normal',
      opacity: 1,
      shadow: {
        enabled: true,
        color: 'rgba(16, 185, 129, 0.3)',
        blur: 6,
        offsetX: 0,
        offsetY: 3
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const data = this.data as PersonNodeData
    const bounds = this.bounds
    const style = this.style

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const radius = Math.min(bounds.width, bounds.height) / 2

    // 绘制阴影
    if (style.shadow.enabled) {
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    }

    // 绘制背景圆形
    ctx.fillStyle = style.backgroundColor
    ctx.globalAlpha = style.opacity
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()

    // 绘制边框
    if (style.borderWidth > 0) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'

    // 绘制头像或图标
    if (data.metadata.avatar) {
      // TODO: 绘制头像图片
    } else {
      ctx.fillStyle = style.textColor
      ctx.font = '20px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const icon = this.getPersonIcon(data.metadata.personType)
      ctx.fillText(icon, centerX, centerY - 5)
    }

    // 绘制姓名
    ctx.font = `${style.fontWeight} ${style.fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const name = this.truncateText(ctx, data.metadata.name || data.title, bounds.width - 10)
    ctx.fillText(name, centerX, bounds.y + bounds.height + 5)

    // 绘制角色
    ctx.font = `normal ${style.fontSize - 2}px Arial`
    ctx.fillStyle = '#6B7280'
    const role = this.truncateText(ctx, data.metadata.role, bounds.width - 10)
    ctx.fillText(role, centerX, bounds.y + bounds.height + 20)

    // 绘制选中状态
    if (this.isSelected) {
      ctx.strokeStyle = '#007AFF'
      ctx.lineWidth = 3
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.restore()
  }

  getContextMenuItems() {
    return [
      { label: '编辑信息', action: 'edit-person', icon: '✏️' },
      { label: '查看详情', action: 'view-details', icon: '👁️' },
      { label: '添加关系', action: 'add-relationship', icon: '🔗' },
      { label: '发送消息', action: 'send-message', icon: '💬' },
      { label: '查看案件', action: 'view-cases', icon: '📋' }
    ]
  }

  private getPersonIcon(personType: PersonNodeData['metadata']['personType']): string {
    const icons: Record<string, string> = {
      'applicant': '👤',
      'respondent': '👥',
      'arbitrator': '⚖️',
      'lawyer': '👨‍💼',
      'witness': '👁️',
      'expert': '🎓',
      'other': '👤'
    }
    return icons[personType] || '👤'
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }
}

// ==================== 文档管理节点 ====================

export class DocumentNode extends BaseNode {
  constructor(data: DocumentNodeData) {
    super(data)
  }

  getDefaultStyle(): NodeStyle {
    return {
      backgroundColor: '#F59E0B',
      borderColor: '#D97706',
      borderWidth: 2,
      borderRadius: 8,
      textColor: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'normal',
      opacity: 1,
      shadow: {
        enabled: true,
        color: 'rgba(245, 158, 11, 0.3)',
        blur: 6,
        offsetX: 0,
        offsetY: 3
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const data = this.data as DocumentNodeData
    const bounds = this.bounds
    const style = this.style

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    // 绘制阴影
    if (style.shadow.enabled) {
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    }

    // 绘制背景
    ctx.fillStyle = style.backgroundColor
    ctx.globalAlpha = style.opacity
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius)
    ctx.fill()

    // 绘制边框
    if (style.borderWidth > 0) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'

    // 绘制文档图标
    ctx.fillStyle = style.textColor
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    const icon = this.getDocumentIcon(data.metadata.documentType)
    ctx.fillText(icon, bounds.x + 25, bounds.y + 30)

    // 绘制文件名
    ctx.font = `${style.fontWeight} ${style.fontSize}px Arial`
    ctx.textAlign = 'left'
    const fileName = this.truncateText(ctx, data.metadata.fileName, bounds.width - 60)
    ctx.fillText(fileName, bounds.x + 50, bounds.y + 25)

    // 绘制文档类型
    ctx.font = `normal ${style.fontSize - 2}px Arial`
    ctx.fillText(data.metadata.documentType, bounds.x + 50, bounds.y + 40)

    // 绘制版本号
    ctx.font = `normal ${style.fontSize - 3}px Arial`
    ctx.fillText(`v${data.metadata.version}`, bounds.x + 50, bounds.y + 55)

    // 绘制审核状态
    const statusColor = this.getReviewStatusColor(data.metadata.reviewStatus)
    ctx.fillStyle = statusColor
    ctx.beginPath()
    ctx.arc(bounds.x + bounds.width - 15, bounds.y + 15, 5, 0, Math.PI * 2)
    ctx.fill()

    // 绘制机密标识
    if (data.metadata.isConfidential) {
      ctx.fillStyle = '#EF4444'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('机密', bounds.x + bounds.width - 25, bounds.y + bounds.height - 10)
    }

    // 绘制选中状态
    if (this.isSelected) {
      this.drawSelectionBorder(ctx, bounds)
    }

    ctx.restore()
  }

  getContextMenuItems() {
    const data = this.data as DocumentNodeData
    const items = [
      { label: '打开文档', action: 'open-document', icon: '📖' },
      { label: '编辑信息', action: 'edit-document', icon: '✏️' },
      { label: '下载文件', action: 'download', icon: '⬇️' },
      { label: '分享文档', action: 'share', icon: '🔗' }
    ]

    if (data.metadata.reviewStatus === 'pending') {
      items.push({ label: '提交审核', action: 'submit-review', icon: '✅' })
    }

    if (data.metadata.ocrText) {
      items.push({ label: '查看OCR文本', action: 'view-ocr', icon: '🔍' })
    }

    return items
  }

  private getDocumentIcon(documentType: DocumentNodeData['metadata']['documentType']): string {
    const icons: Record<string, string> = {
      'evidence': '📋',
      'contract': '📄',
      'petition': '📝',
      'response': '📋',
      'ruling': '⚖️',
      'agreement': '🤝',
      'other': '📄'
    }
    return icons[documentType] || '📄'
  }

  private getReviewStatusColor(status: DocumentNodeData['metadata']['reviewStatus']): string {
    const colors: Record<string, string> = {
      'pending': '#F59E0B',
      'reviewed': '#10B981',
      'approved': '#059669',
      'rejected': '#EF4444'
    }
    return colors[status || 'pending'] || '#6B7280'
  }



  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  private drawSelectionBorder(ctx: CanvasRenderingContext2D, bounds: any) {
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    this.roundRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, this.style.borderRadius + 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// ==================== 时间轴节点 ====================

export class TimelineNode extends BaseNode {
  constructor(data: TimelineNodeData) {
    super(data)
  }

  getDefaultStyle(): NodeStyle {
    return {
      backgroundColor: '#8B5CF6',
      borderColor: '#7C3AED',
      borderWidth: 2,
      borderRadius: 16,
      textColor: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'normal',
      opacity: 1,
      shadow: {
        enabled: true,
        color: 'rgba(139, 92, 246, 0.3)',
        blur: 6,
        offsetX: 0,
        offsetY: 3
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const data = this.data as TimelineNodeData
    const bounds = this.bounds
    const style = this.style

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    // 绘制阴影
    if (style.shadow.enabled) {
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    }

    // 绘制背景
    ctx.fillStyle = style.backgroundColor
    ctx.globalAlpha = style.opacity
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius)
    ctx.fill()

    // 绘制边框
    if (style.borderWidth > 0) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'

    // 绘制时间图标
    ctx.fillStyle = style.textColor
    ctx.font = '18px Arial'
    ctx.textAlign = 'center'
    const icon = this.getEventIcon(data.metadata.eventType)
    ctx.fillText(icon, bounds.x + 20, bounds.y + 25)

    // 绘制事件标题
    ctx.font = `${style.fontWeight} ${style.fontSize}px Arial`
    ctx.textAlign = 'left'
    const title = this.truncateText(ctx, data.title, bounds.width - 50)
    ctx.fillText(title, bounds.x + 40, bounds.y + 20)

    // 绘制日期
    ctx.font = `normal ${style.fontSize - 2}px Arial`
    const dateStr = this.formatDate(data.metadata.eventDate)
    ctx.fillText(dateStr, bounds.x + 40, bounds.y + 35)

    // 绘制重要性指示器
    const importanceColor = this.getImportanceColor(data.metadata.importance)
    ctx.fillStyle = importanceColor
    ctx.beginPath()
    ctx.arc(bounds.x + bounds.width - 15, bounds.y + 15, 6, 0, Math.PI * 2)
    ctx.fill()

    // 绘制完成状态
    if (data.metadata.isCompleted) {
      ctx.fillStyle = '#10B981'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('✓', bounds.x + bounds.width - 15, bounds.y + bounds.height - 10)
    }

    // 绘制提醒指示器
    if (data.metadata.reminders && data.metadata.reminders.length > 0) {
      ctx.fillStyle = '#F59E0B'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('🔔', bounds.x + 10, bounds.y + bounds.height - 5)
    }

    // 绘制选中状态
    if (this.isSelected) {
      this.drawSelectionBorder(ctx, bounds)
    }

    ctx.restore()
  }

  getContextMenuItems() {
    const data = this.data as TimelineNodeData
    const items = [
      { label: '编辑事件', action: 'edit-event', icon: '✏️' },
      { label: '查看详情', action: 'view-details', icon: '👁️' },
      { label: '设置提醒', action: 'set-reminder', icon: '⏰' }
    ]

    if (!data.metadata.isCompleted) {
      items.push({ label: '标记完成', action: 'mark-completed', icon: '✅' })
    } else {
      items.push({ label: '标记未完成', action: 'mark-incomplete', icon: '❌' })
    }

    if (data.metadata.recurrence) {
      items.push({ label: '编辑重复', action: 'edit-recurrence', icon: '🔄' })
    } else {
      items.push({ label: '设置重复', action: 'set-recurrence', icon: '🔄' })
    }

    return items
  }

  private getEventIcon(eventType: TimelineNodeData['metadata']['eventType']): string {
    const icons: Record<string, string> = {
      'milestone': '🏁',
      'deadline': '⏰',
      'hearing': '🏛️',
      'filing': '📋',
      'notification': '📢',
      'other': '📅'
    }
    return icons[eventType] || '📅'
  }

  private getImportanceColor(importance: TimelineNodeData['metadata']['importance']): string {
    const colors: Record<string, string> = {
      'low': '#6B7280',
      'medium': '#F59E0B',
      'high': '#EF4444',
      'critical': '#DC2626'
    }
    return colors[importance] || '#6B7280'
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  private drawSelectionBorder(ctx: CanvasRenderingContext2D, bounds: any) {
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    this.roundRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, this.style.borderRadius + 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// ==================== 流程模板节点 ====================

export class ProcessNode extends BaseNode {
  constructor(data: ProcessNodeData) {
    super(data)
  }

  getDefaultStyle(): NodeStyle {
    return {
      backgroundColor: '#EF4444',
      borderColor: '#DC2626',
      borderWidth: 2,
      borderRadius: 10,
      textColor: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
      opacity: 1,
      shadow: {
        enabled: true,
        color: 'rgba(239, 68, 68, 0.3)',
        blur: 6,
        offsetX: 0,
        offsetY: 3
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const data = this.data as ProcessNodeData
    const bounds = this.bounds
    const style = this.style

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    // 绘制阴影
    if (style.shadow.enabled) {
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    }

    // 绘制背景
    ctx.fillStyle = style.backgroundColor
    ctx.globalAlpha = style.opacity
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius)
    ctx.fill()

    // 绘制边框
    if (style.borderWidth > 0) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'

    // 绘制流程图标
    ctx.fillStyle = style.textColor
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    const icon = this.getProcessIcon(data.metadata.processType)
    ctx.fillText(icon, bounds.x + 25, bounds.y + 30)

    // 绘制流程标题
    ctx.font = `${style.fontWeight} ${style.fontSize}px Arial`
    ctx.textAlign = 'left'
    const title = this.truncateText(ctx, data.title, bounds.width - 60)
    ctx.fillText(title, bounds.x + 50, bounds.y + 25)

    // 绘制模板名称
    ctx.font = `normal ${style.fontSize - 2}px Arial`
    ctx.fillText(data.metadata.template?.name || '未命名模板', bounds.x + 50, bounds.y + 40)

    // 绘制进度条
    const progressBarWidth = bounds.width - 60
    const progressBarHeight = 6
    const progressX = bounds.x + 50
    const progressY = bounds.y + 50

    // 进度条背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.fillRect(progressX, progressY, progressBarWidth, progressBarHeight)

    // 进度条填充
    ctx.fillStyle = '#10B981'
    const percentage = data.metadata.progress?.percentage || 0
    const fillWidth = (progressBarWidth * percentage) / 100
    ctx.fillRect(progressX, progressY, fillWidth, progressBarHeight)

    // 进度文字
    ctx.fillStyle = style.textColor
    ctx.font = `normal ${style.fontSize - 3}px Arial`
    ctx.textAlign = 'right'
    ctx.fillText(`${percentage}%`, bounds.x + bounds.width - 10, bounds.y + 55)

    // 绘制步骤统计
    ctx.textAlign = 'left'
    const completedSteps = data.metadata.progress?.completedSteps || 0
    const totalSteps = data.metadata.progress?.totalSteps || 0
    ctx.fillText(
      `${completedSteps}/${totalSteps} 步骤`,
      bounds.x + 50,
      bounds.y + 70
    )

    // 绘制选中状态
    if (this.isSelected) {
      this.drawSelectionBorder(ctx, bounds)
    }

    ctx.restore()
  }

  getContextMenuItems() {
    // const data = this.data as ProcessNodeData
    return [
      { label: '查看步骤', action: 'view-steps', icon: '📋' },
      { label: '编辑流程', action: 'edit-process', icon: '✏️' },
      { label: '开始执行', action: 'start-process', icon: '▶️' },
      { label: '暂停流程', action: 'pause-process', icon: '⏸️' },
      { label: '重置进度', action: 'reset-progress', icon: '🔄' },
      { label: '另存为模板', action: 'save-template', icon: '💾' }
    ]
  }

  private getProcessIcon(processType: ProcessNodeData['metadata']['processType'] | undefined): string {
    const icons: Record<string, string> = {
      'hearing-prep': '📋',
      'hearing': '🏛️',
      'deliberation': '🤔',
      'ruling': '⚖️',
      'execution': '✅',
      'custom': '⚙️'
    }
    return icons[processType || 'custom'] || '⚙️'
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  private drawSelectionBorder(ctx: CanvasRenderingContext2D, bounds: any) {
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    this.roundRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, this.style.borderRadius + 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// ==================== AI助手节点 ====================

export class AIAssistantNode extends BaseNode {
  constructor(data: AIAssistantNodeData) {
    super(data)
  }

  getDefaultStyle(): NodeStyle {
    return {
      backgroundColor: '#06B6D4',
      borderColor: '#0891B2',
      borderWidth: 2,
      borderRadius: 20,
      textColor: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
      opacity: 1,
      shadow: {
        enabled: true,
        color: 'rgba(6, 182, 212, 0.4)',
        blur: 8,
        offsetX: 0,
        offsetY: 4
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState) {
    const data = this.data as AIAssistantNodeData
    const bounds = this.bounds
    const style = this.style

    ctx.save()

    // 应用视口变换
    const transform = viewport.transform
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    // 绘制阴影
    if (style.shadow.enabled) {
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur
      ctx.shadowOffsetX = style.shadow.offsetX
      ctx.shadowOffsetY = style.shadow.offsetY
    }

    // 绘制背景（带渐变效果）
    const gradient = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.height)
    gradient.addColorStop(0, style.backgroundColor)
    gradient.addColorStop(1, '#0891B2')
    ctx.fillStyle = gradient
    ctx.globalAlpha = style.opacity
    this.roundRect(ctx, bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius)
    ctx.fill()

    // 绘制边框
    if (style.borderWidth > 0) {
      ctx.strokeStyle = style.borderColor
      ctx.lineWidth = style.borderWidth
      ctx.stroke()
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'

    // 绘制AI图标（带动画效果）
    ctx.fillStyle = style.textColor
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    const icon = this.getAIIcon(data.metadata.aiType)
    ctx.fillText(icon, bounds.x + 30, bounds.y + 35)

    // 绘制AI类型标题
    ctx.font = `${style.fontWeight} ${style.fontSize}px Arial`
    ctx.textAlign = 'left'
    const title = this.truncateText(ctx, data.title, bounds.width - 70)
    ctx.fillText(title, bounds.x + 60, bounds.y + 25)

    // 绘制AI类型
    ctx.font = `normal ${style.fontSize - 2}px Arial`
    const aiTypeText = this.getAITypeText(data.metadata.aiType)
    ctx.fillText(aiTypeText, bounds.x + 60, bounds.y + 40)

    // 绘制对话数量
    if (data.metadata.conversationHistory && data.metadata.conversationHistory.length > 0) {
      ctx.font = `normal ${style.fontSize - 3}px Arial`
      ctx.fillText(`${data.metadata.conversationHistory.length} 条对话`, bounds.x + 60, bounds.y + 55)
    }

    // 绘制置信度指示器
    if (data.metadata.confidence !== undefined) {
      const confidenceColor = this.getConfidenceColor(data.metadata.confidence)
      ctx.fillStyle = confidenceColor
      ctx.beginPath()
      ctx.arc(bounds.x + bounds.width - 15, bounds.y + 15, 6, 0, Math.PI * 2)
      ctx.fill()

      // 置信度文字
      ctx.fillStyle = style.textColor
      ctx.font = 'bold 8px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(data.metadata.confidence * 100)}%`, bounds.x + bounds.width - 15, bounds.y + 18)
    }

    // 绘制在线状态指示器
    ctx.fillStyle = '#10B981'
    ctx.beginPath()
    ctx.arc(bounds.x + bounds.width - 15, bounds.y + bounds.height - 15, 4, 0, Math.PI * 2)
    ctx.fill()

    // 绘制最后交互时间
    if (data.metadata.lastInteraction) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = `normal ${style.fontSize - 4}px Arial`
      ctx.textAlign = 'right'
      const timeAgo = this.getTimeAgo(data.metadata.lastInteraction)
      ctx.fillText(timeAgo, bounds.x + bounds.width - 10, bounds.y + bounds.height - 5)
    }

    // 绘制能力标签
    if (data.metadata.capabilities && data.metadata.capabilities.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(bounds.x + 5, bounds.y + bounds.height - 20, bounds.width - 10, 15)

      ctx.fillStyle = style.textColor
      ctx.font = `normal ${style.fontSize - 4}px Arial`
      ctx.textAlign = 'left'
      const capabilityText = data.metadata.capabilities.slice(0, 2).join(', ')
      const truncatedCapabilities = this.truncateText(ctx, capabilityText, bounds.width - 15)
      ctx.fillText(truncatedCapabilities, bounds.x + 8, bounds.y + bounds.height - 10)
    }

    // 绘制选中状态
    if (this.isSelected) {
      this.drawSelectionBorder(ctx, bounds)
    }

    ctx.restore()
  }

  getContextMenuItems() {
    const data = this.data as AIAssistantNodeData
    const items = [
      { label: '开始对话', action: 'start-chat', icon: '💬' },
      { label: '查看历史', action: 'view-history', icon: '📜' },
      { label: '清空对话', action: 'clear-chat', icon: '🗑️' },
      { label: '生成报告', action: 'generate-report', icon: '📄' }
    ]

    // 根据AI类型添加特定功能
    switch (data.metadata.aiType) {
      case 'legal-analysis':
        items.push({ label: '深度分析', action: 'deep-analysis', icon: '🧠' })
        break
      case 'document-generation':
        items.push({ label: '生成文书', action: 'generate-document', icon: '📄' })
        break
      case 'case-research':
        items.push({ label: '法条检索', action: 'search-law', icon: '📚' })
        break
      case 'strategy-advice':
        items.push({ label: '策略建议', action: 'get-strategy', icon: '💡' })
        break
    }

    return items
  }

  private getAIIcon(aiType: AIAssistantNodeData['metadata']['aiType']): string {
    const icons: Record<string, string> = {
      'legal-analysis': '🧠',
      'document-generation': '📝',
      'case-research': '🔍',
      'strategy-advice': '💡',
      'general': '🤖'
    }
    return icons[aiType || 'general'] || '🤖'
  }

  private getAITypeText(aiType: AIAssistantNodeData['metadata']['aiType']): string {
    const texts: Record<string, string> = {
      'legal-analysis': '法律分析',
      'document-generation': '文书生成',
      'case-research': '案例研究',
      'strategy-advice': '策略建议',
      'general': '通用助手'
    }
    return texts[aiType || 'general'] || '通用助手'
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10B981'
    if (confidence >= 0.6) return '#F59E0B'
    return '#EF4444'
  }

  private getTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}小时前`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}天前`
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text)
    if (metrics.width <= maxWidth) return text

    let truncated = text
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  private drawSelectionBorder(ctx: CanvasRenderingContext2D, bounds: any) {
    ctx.strokeStyle = '#007AFF'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])
    this.roundRect(ctx, bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4, this.style.borderRadius + 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// 注册节点类到工厂
NodeFactory.registerNodeClass('case-info', CaseInfoNode)
NodeFactory.registerNodeClass('person', PersonNode)
NodeFactory.registerNodeClass('document', DocumentNode)
NodeFactory.registerNodeClass('timeline', TimelineNode)
NodeFactory.registerNodeClass('process', ProcessNode)
NodeFactory.registerNodeClass('ai-assistant', AIAssistantNode)
