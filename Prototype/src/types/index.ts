/**
 * 类型定义导出
 * 
 * 统一导出所有类型定义，方便其他模块导入
 */

// 法律节点类型
export type {
  LegalNodeType,
  Position,
  Size,
  NodeMetadata,
  LegalNodeBase,
  CaseNodeData,
  PersonNodeData,
  DocumentNodeData,
  HearingNodeData,
  MediationNodeData,
  TimelineNodeData,
  LegalNodeData,
  LegalNode,
  CaseNode,
  PersonNode,
  DocumentNode,
  HearingNode,
  MediationNode,
  TimelineNode,
  NodeUpdateEvent,
  NodeDeleteEvent,
} from './legal-node';

export {
  isCaseNode,
  isPersonNode,
  isDocumentNode,
  isHearingNode,
  isMediationNode,
  isTimelineNode,
} from './legal-node';

// 连接类型
export type {
  ConnectionType,
  ConnectionStyle,
  ConnectionLabel,
  ConnectionMetadata,
  Connection,
  ConnectionUpdateEvent,
  ConnectionDeleteEvent,
} from './connection';

export {
  isWorkflowConnection,
  isRelationshipConnection,
  isReferenceConnection,
  isDependencyConnection,
  isCollaborationConnection,
} from './connection';

// 画布类型
export type {
  Viewport,
  CanvasState,
  CanvasMetadata,
  CanvasData,
  CanvasOperation,
  CanvasHistory,
  CanvasConfig,
  CanvasEvent,
} from './canvas';

// 通用类型
export type {
  User,
  Case,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  FileInfo,
  Permission,
  PermissionConfig,
  Notification,
  LoadingState,
  AsyncDataState,
} from './common';

// 评论类型
export type {
  CommentAuthor,
  CommentReply,
  Comment,
  CreateCommentParams,
  UpdateCommentParams,
  CreateReplyParams,
} from './comment';

// 光标类型
export type {
  UserCursor,
  UpdateCursorParams,
} from './cursor';

// 选中指示类型
export type {
  UserSelection,
  UpdateSelectionParams,
} from './selection';

// 语音场类型
export type {
  VoiceZoneBounds,
  VoiceZone,
  CreateVoiceZoneParams,
} from './voice-zone';

