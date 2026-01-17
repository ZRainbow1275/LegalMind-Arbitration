// dev/src/lib/websocket.ts
// WebSocket实时通信管理器 - 支持庭审实时通信和消息推送

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from './auth';
import { getEnv } from './env-validator';
import { logger } from './logger';
import { prisma } from './prisma';
import { fromHearingStatus } from './hearing-utils';

type JsonRecord = Record<string, unknown>;

// WebSocket事件类型定义
export interface WebSocketEvents {
  // 连接管理
  connection: (socket: AuthenticatedSocket) => void;
  disconnect: (reason: string) => void;
  
  // 庭审相关事件
  join_hearing: (data: { hearingId: string }) => void;
  leave_hearing: (data: { hearingId: string }) => void;
  hearing_message: (data: { hearingId: string; message: string; type: string }) => void;
  
  // 案件相关事件
  join_case: (data: { caseId: string }) => void;
  leave_case: (data: { caseId: string }) => void;
  case_update: (data: { caseId: string; update: JsonRecord }) => void;
  
  // 通知相关事件
  notification: (data: { type: string; title: string; content: string; metadata?: JsonRecord }) => void;
  
  // AI助手相关事件
  ai_analysis_request: (data: { type: string; context: JsonRecord }) => void;
  ai_analysis_result: (data: { requestId: string; result: JsonRecord }) => void;
  
  // 系统事件
  system_status: (data: { status: string; message?: string }) => void;
}

// 认证Socket接口
export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userRoles: string[];
  joinedRooms: Set<string>;
}

// WebSocket连接管理器
export class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket[]> = new Map();       
  private hearingRooms: Map<string, Set<string>> = new Map(); // hearingId -> Set<userId>
  private caseRooms: Map<string, Set<string>> = new Map(); // caseId -> Set<userId>

  constructor(server: HTTPServer) {
    const env = getEnv();
    const origin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
    if (env.NODE_ENV === 'production' && origin.includes('localhost')) {
      throw new Error('Refuse to start WebSocket with localhost origin in production');
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware() {
    // 认证中间件
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const payload = verifyToken(token);
        if (!payload) {
          return next(new Error('Invalid authentication token'));
        }

        // 验证用户是否存在且状态正常
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { roles: true },
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('User not found or inactive'));
        }

        // 将用户信息附加到socket
        const authedSocket = socket as unknown as AuthenticatedSocket;
        authedSocket.userId = payload.userId;
        authedSocket.userEmail = payload.email;
        authedSocket.userRoles = user.roles.map(r => r.role);
        authedSocket.joinedRooms = new Set<string>();

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const authedSocket = socket as unknown as AuthenticatedSocket;
      logger.info(
        { userId: authedSocket.userId, userEmail: authedSocket.userEmail, socketId: authedSocket.id },
        'WebSocket connected'
      );

      // 添加到连接用户列表
      this.addConnectedUser(authedSocket);

      // 加入用户个人房间（用于私人通知）
      authedSocket.join(`user:${authedSocket.userId}`);

      // 发送连接成功消息
      authedSocket.emit('connected', {
        userId: authedSocket.userId,
        timestamp: new Date().toISOString(),
        serverStatus: 'online',
      });

      // 庭审相关事件
      this.setupHearingEvents(authedSocket);

      // 案件相关事件
      this.setupCaseEvents(authedSocket);

      // 通知相关事件
      this.setupNotificationEvents(authedSocket);

      // AI助手相关事件
      this.setupAIEvents(authedSocket);

      // 断开连接处理
      authedSocket.on('disconnect', (reason) => {
        logger.info(
          { userId: authedSocket.userId, userEmail: authedSocket.userEmail, reason },
          'WebSocket disconnected'
        );
        this.removeConnectedUser(authedSocket);
        this.cleanupUserRooms(authedSocket);
      });

      // 心跳检测
      authedSocket.on('ping', () => {
        authedSocket.emit('pong', { timestamp: new Date().toISOString() });
      });
    });
  }

  /**
   * 设置庭审相关事件
   */
  private setupHearingEvents(socket: AuthenticatedSocket) {
    // 加入庭审房间
    socket.on('join_hearing', async (data: { hearingId: string }) => {
      try {
        const { hearingId } = data;

        // 验证用户是否有权限参与此庭审
        const hasAccess = await this.verifyHearingAccess(socket.userId, hearingId);
        if (!hasAccess) {
          socket.emit('error', { message: '您没有参与此庭审的权限' });
          return;
        }

        // 加入庭审房间
        socket.join(`hearing:${hearingId}`);
        socket.joinedRooms.add(`hearing:${hearingId}`);

        // 更新庭审房间用户列表
        if (!this.hearingRooms.has(hearingId)) {
          this.hearingRooms.set(hearingId, new Set());
        }
        this.hearingRooms.get(hearingId)!.add(socket.userId);

        // 通知其他参与者
        socket.to(`hearing:${hearingId}`).emit('participant_joined', {
          userId: socket.userId,
          userEmail: socket.userEmail,
          timestamp: new Date().toISOString(),
        });

        // 发送当前庭审状态
        const hearingStatus = await this.getHearingStatus(hearingId);
        socket.emit('hearing_status', hearingStatus);

        logger.info({ userId: socket.userId, userEmail: socket.userEmail, hearingId }, 'Joined hearing');
      } catch (error) {
        socket.emit('error', { message: '加入庭审失败' });
      }
    });

    // 离开庭审房间
    socket.on('leave_hearing', (data: { hearingId: string }) => {
      const { hearingId } = data;
      
      socket.leave(`hearing:${hearingId}`);
      socket.joinedRooms.delete(`hearing:${hearingId}`);

      // 更新庭审房间用户列表
      this.hearingRooms.get(hearingId)?.delete(socket.userId);

      // 通知其他参与者
      socket.to(`hearing:${hearingId}`).emit('participant_left', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        timestamp: new Date().toISOString(),
      });

      logger.info({ userId: socket.userId, userEmail: socket.userEmail, hearingId }, 'Left hearing');
    });

    // 庭审消息
    socket.on('hearing_message', (data: { hearingId: string; message: string; type: string }) => {
      const { hearingId, message, type } = data;

      // 验证用户是否在庭审房间中
      if (!socket.joinedRooms.has(`hearing:${hearingId}`)) {
        socket.emit('error', { message: '您不在此庭审中' });
        return;
      }

      // 广播消息到庭审房间
      this.io.to(`hearing:${hearingId}`).emit('hearing_message', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        message,
        type,
        timestamp: new Date().toISOString(),
      });

      // 记录庭审消息（可选）
      this.logHearingMessage(hearingId, socket.userId, message, type);
    });
  }

  /**
   * 设置案件相关事件
   */
  private setupCaseEvents(socket: AuthenticatedSocket) {
    // 加入案件房间
    socket.on('join_case', async (data: { caseId: string }) => {
      try {
        const { caseId } = data;

        // 验证用户是否有权限访问此案件
        const hasAccess = await this.verifyCaseAccess(socket.userId, caseId);
        if (!hasAccess) {
          socket.emit('error', { message: '您没有访问此案件的权限' });
          return;
        }

        // 加入案件房间
        socket.join(`case:${caseId}`);
        socket.joinedRooms.add(`case:${caseId}`);

        // 更新案件房间用户列表
        if (!this.caseRooms.has(caseId)) {
          this.caseRooms.set(caseId, new Set());
        }
        this.caseRooms.get(caseId)!.add(socket.userId);

        logger.info({ userId: socket.userId, userEmail: socket.userEmail, caseId }, 'Joined case');
      } catch (error) {
        socket.emit('error', { message: '加入案件失败' });
      }
    });

    // 离开案件房间
    socket.on('leave_case', (data: { caseId: string }) => {
      const { caseId } = data;
      
      socket.leave(`case:${caseId}`);
      socket.joinedRooms.delete(`case:${caseId}`);

      // 更新案件房间用户列表
      this.caseRooms.get(caseId)?.delete(socket.userId);

      logger.info({ userId: socket.userId, userEmail: socket.userEmail, caseId }, 'Left case');
    });
  }

  /**
   * 设置通知相关事件
   */
  private setupNotificationEvents(socket: AuthenticatedSocket) {
    // 客户端可以请求获取未读通知数量
      socket.on('get_unread_count', async () => {
        try {
          const unreadCount = await prisma.notification.count({
            where: {
              userId: socket.userId,
              readAt: null,
              archivedAt: null,
            },
          });

          socket.emit('unread_count', { count: unreadCount });
        } catch (error) {
          socket.emit('error', { message: '获取未读通知数量失败' });
      }
    });
  }

  /**
   * 设置AI助手相关事件
   */
  private setupAIEvents(socket: AuthenticatedSocket) {
    // AI分析请求
    socket.on('ai_analysis_request', async (data: { type: string; context: JsonRecord }) => {
      try {
        const { type, context } = data;
        const requestId = crypto.randomUUID();

        // 这里应该调用实际的AI服务
        // 暂时返回模拟结果
        setTimeout(() => {
          socket.emit('ai_analysis_result', {
            requestId,
            type,
            result: {
              analysis: '这是AI分析结果...',
              confidence: 0.85,
              recommendations: ['建议1', '建议2'],
              timestamp: new Date().toISOString(),
            },
          });
        }, 2000); // 模拟2秒处理时间

      } catch (error) {
        socket.emit('error', { message: 'AI分析请求失败' });
      }
    });
  }

  /**
   * 添加连接用户
   */
  private addConnectedUser(socket: AuthenticatedSocket) {
    if (!this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.set(socket.userId, []);
    }
    this.connectedUsers.get(socket.userId)!.push(socket);
  }

  /**
   * 移除连接用户
   */
  private removeConnectedUser(socket: AuthenticatedSocket) {
    const userSockets = this.connectedUsers.get(socket.userId);
    if (userSockets) {
      const index = userSockets.indexOf(socket);
      if (index > -1) {
        userSockets.splice(index, 1);
      }
      if (userSockets.length === 0) {
        this.connectedUsers.delete(socket.userId);
      }
    }
  }

  /**
   * 清理用户房间
   */
  private cleanupUserRooms(socket: AuthenticatedSocket) {
    // 从所有房间中移除用户
    for (const room of socket.joinedRooms) {
      if (room.startsWith('hearing:')) {
        const hearingId = room.replace('hearing:', '');
        this.hearingRooms.get(hearingId)?.delete(socket.userId);
      } else if (room.startsWith('case:')) {
        const caseId = room.replace('case:', '');
        this.caseRooms.get(caseId)?.delete(socket.userId);
      }
    }
  }

  /**
   * 验证庭审访问权限
   */
  private async verifyHearingAccess(userId: string, hearingId: string): Promise<boolean> {
    try {
      const hearing = await prisma.hearing.findUnique({
        where: { id: hearingId },
        select: {
          id: true,
          case: {
            select: {
              applicantId: true,
              respondentId: true,
              participants: {
                where: { userId, isActive: true },
                select: { id: true },
              },
            },
          },
          participants: {
            where: { userId },
            select: { id: true },
          },
        },
      });

      if (!hearing) return false;

      return hearing.case.applicantId === userId
        || hearing.case.respondentId === userId
        || hearing.case.participants.length > 0
        || hearing.participants.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证案件访问权限
   */
  private async verifyCaseAccess(userId: string, caseId: string): Promise<boolean> {
    try {
      const case_ = await prisma.arbitrationCase.findUnique({
        where: { id: caseId },
        include: {
          participants: {
            where: { userId, isActive: true },
          },
        },
      });

      if (!case_) return false;

      return case_.applicantId === userId ||
        case_.respondentId === userId ||
        case_.participants.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取庭审状态
   */
  private async getHearingStatus(hearingId: string): Promise<JsonRecord> {
    const timestamp = new Date().toISOString();
    const participants = Array.from(this.hearingRooms.get(hearingId) || []);

    try {
      const hearing = await prisma.hearing.findUnique({
        where: { id: hearingId },
        select: { status: true },
      });

      return {
        hearingId,
        status: hearing ? fromHearingStatus(hearing.status) : 'unknown',
        participants,
        timestamp,
      };
    } catch {
      return { hearingId, status: 'unknown', participants, timestamp };
    }
  }

  /**
   * 记录庭审消息
   */
  private async logHearingMessage(hearingId: string, userId: string, message: string, type: string) {
    // 这里可以将庭审消息记录到数据库
    logger.info(
      { hearingId, userId, type, messageLength: message.length, timestamp: new Date().toISOString() },
      'Hearing message recorded'
    );
  }

  /**
   * 公共方法：向特定用户发送通知
   */
  public sendNotificationToUser(userId: string, notification: JsonRecord) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * 公共方法：向庭审房间广播消息
   */
  public broadcastToHearing(hearingId: string, event: string, data: JsonRecord) {
    this.io.to(`hearing:${hearingId}`).emit(event, data);
  }

  /**
   * 公共方法：向案件房间广播消息
   */
  public broadcastToCase(caseId: string, event: string, data: JsonRecord) {
    this.io.to(`case:${caseId}`).emit(event, data);
  }

  /**
   * 获取在线用户统计
   */
  public getOnlineStats() {
    return {
      totalConnections: this.io.sockets.sockets.size,
      uniqueUsers: this.connectedUsers.size,
      activeHearings: this.hearingRooms.size,
      activeCases: this.caseRooms.size,
    };
  }
}

// 全局WebSocket管理器实例
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}
