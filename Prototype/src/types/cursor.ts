/**
 * 实时光标系统数据模型
 * 用于显示其他协作者的鼠标位置
 */

/**
 * 用户光标
 */
export interface UserCursor {
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number }; // 画布坐标
  lastUpdate: Date;
}

/**
 * 光标更新参数
 */
export interface UpdateCursorParams {
  userId: string;
  position: { x: number; y: number };
  userName?: string;
  userColor?: string;
}

