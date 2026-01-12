/**
 * LegalMind法律工作台 - 协作服务器
 * 
 * 提供WebSocket实时协作功能
 * 基于Socket.io实现
 * 
 * 功能：
 * - 用户连接管理
 * - 实时光标同步
 * - 操作广播
 * - 评论系统
 * - 冲突解决
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 创建Express应用
const app = express();
app.use(cors());
app.use(express.json());

// 创建HTTP服务器
const server = http.createServer(app);

// 创建Socket.io服务器
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// 存储画布房间和用户信息
const canvasRooms = new Map(); // canvasId -> { users: Map<userId, user>, operations: [] }

// 生成用户颜色
const USER_COLORS = [
  '#FF6B35', // 橙色
  '#4ECDC4', // 青色
  '#45B7D1', // 蓝色
  '#FFA07A', // 浅橙色
  '#98D8C8', // 薄荷绿
  '#F7DC6F', // 黄色
  '#BB8FCE', // 紫色
  '#85C1E2', // 天蓝色
];

function getUserColor(userId) {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_COLORS[hash % USER_COLORS.length];
}

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log(`[Collaboration] 用户连接: ${socket.id}`);

  // 用户加入画布
  socket.on('join-canvas', (data) => {
    const { canvasId, user } = data;
    
    console.log(`[Collaboration] 用户 ${user.name} 加入画布 ${canvasId}`);

    // 加入房间
    socket.join(canvasId);
    socket.canvasId = canvasId;
    socket.userId = user.id;

    // 初始化房间（如果不存在）
    if (!canvasRooms.has(canvasId)) {
      canvasRooms.set(canvasId, {
        users: new Map(),
        operations: [],
        comments: new Map(),
      });
    }

    const room = canvasRooms.get(canvasId);

    // 添加用户到房间
    const userWithColor = {
      ...user,
      color: getUserColor(user.id),
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
    };
    room.users.set(user.id, userWithColor);

    // 通知其他用户有新用户加入
    socket.to(canvasId).emit('user-joined', {
      user: userWithColor,
      timestamp: Date.now(),
    });

    // 发送当前房间的所有用户给新加入的用户
    socket.emit('room-state', {
      users: Array.from(room.users.values()),
      operations: room.operations.slice(-100), // 最近100个操作
      timestamp: Date.now(),
    });

    console.log(`[Collaboration] 画布 ${canvasId} 当前用户数: ${room.users.size}`);
  });

  // 用户离开画布
  socket.on('leave-canvas', () => {
    handleUserLeave(socket);
  });

  // 光标移动
  socket.on('cursor-move', (data) => {
    const { canvasId, position } = data;
    
    // 广播给房间内其他用户
    socket.to(canvasId).emit('cursor-update', {
      userId: socket.userId,
      position,
      timestamp: Date.now(),
    });
  });

  // 选择变化
  socket.on('selection-change', (data) => {
    const { canvasId, elementIds } = data;
    
    socket.to(canvasId).emit('selection-update', {
      userId: socket.userId,
      elementIds,
      timestamp: Date.now(),
    });
  });

  // 操作广播（节点创建、更新、删除等）
  socket.on('operation', (data) => {
    const { canvasId, operation } = data;
    
    const room = canvasRooms.get(canvasId);
    if (room) {
      // 保存操作历史
      room.operations.push({
        ...operation,
        userId: socket.userId,
        timestamp: Date.now(),
      });

      // 限制操作历史长度
      if (room.operations.length > 1000) {
        room.operations = room.operations.slice(-1000);
      }

      // 广播操作给其他用户
      socket.to(canvasId).emit('operation', {
        operation,
        userId: socket.userId,
        timestamp: Date.now(),
      });

      console.log(`[Collaboration] 操作广播: ${operation.type} by ${socket.userId}`);
    }
  });

  // 评论添加
  socket.on('comment-add', (data) => {
    const { canvasId, comment } = data;
    
    const room = canvasRooms.get(canvasId);
    if (room) {
      const commentWithId = {
        ...comment,
        id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: socket.userId,
        createdAt: new Date().toISOString(),
      };

      room.comments.set(commentWithId.id, commentWithId);

      // 广播评论给所有用户（包括自己）
      io.to(canvasId).emit('comment-added', {
        comment: commentWithId,
        timestamp: Date.now(),
      });

      console.log(`[Collaboration] 评论添加: ${commentWithId.id}`);
    }
  });

  // 评论更新
  socket.on('comment-update', (data) => {
    const { canvasId, commentId, updates } = data;
    
    const room = canvasRooms.get(canvasId);
    if (room && room.comments.has(commentId)) {
      const comment = room.comments.get(commentId);
      const updatedComment = {
        ...comment,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      room.comments.set(commentId, updatedComment);

      io.to(canvasId).emit('comment-updated', {
        comment: updatedComment,
        timestamp: Date.now(),
      });
    }
  });

  // 评论删除
  socket.on('comment-delete', (data) => {
    const { canvasId, commentId } = data;
    
    const room = canvasRooms.get(canvasId);
    if (room && room.comments.has(commentId)) {
      room.comments.delete(commentId);

      io.to(canvasId).emit('comment-deleted', {
        commentId,
        timestamp: Date.now(),
      });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`[Collaboration] 用户断开连接: ${socket.id}`);
    handleUserLeave(socket);
  });

  // 错误处理
  socket.on('error', (error) => {
    console.error(`[Collaboration] Socket错误:`, error);
  });
});

// 处理用户离开
function handleUserLeave(socket) {
  const { canvasId, userId } = socket;
  
  if (canvasId && userId) {
    const room = canvasRooms.get(canvasId);
    if (room) {
      room.users.delete(userId);

      // 通知其他用户
      socket.to(canvasId).emit('user-left', {
        userId,
        timestamp: Date.now(),
      });

      console.log(`[Collaboration] 用户 ${userId} 离开画布 ${canvasId}`);
      console.log(`[Collaboration] 画布 ${canvasId} 当前用户数: ${room.users.size}`);

      // 如果房间为空，清理房间
      if (room.users.size === 0) {
        canvasRooms.delete(canvasId);
        console.log(`[Collaboration] 画布 ${canvasId} 已清理`);
      }
    }
  }
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: canvasRooms.size,
    totalUsers: Array.from(canvasRooms.values()).reduce((sum, room) => sum + room.users.size, 0),
  });
});

// 获取房间信息
app.get('/rooms', (req, res) => {
  const rooms = Array.from(canvasRooms.entries()).map(([canvasId, room]) => ({
    canvasId,
    userCount: room.users.size,
    users: Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      joinedAt: u.joinedAt,
    })),
    operationCount: room.operations.length,
    commentCount: room.comments.size,
  }));

  res.json({
    rooms,
    totalRooms: rooms.length,
    totalUsers: rooms.reduce((sum, r) => sum + r.userCount, 0),
  });
});

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  LegalMind法律工作台 - 协作服务器                          ║
║  WebSocket Server Running on http://localhost:${PORT}       ║
║                                                            ║
║  健康检查: http://localhost:${PORT}/health                  ║
║  房间信息: http://localhost:${PORT}/rooms                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[Collaboration] 收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('[Collaboration] 服务器已关闭');
    process.exit(0);
  });
});

