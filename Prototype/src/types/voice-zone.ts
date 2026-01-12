/**
 * 语音场系统数据模型
 * 用于框选区域创建语音讨论区
 */

/**
 * 语音场边界
 */
export interface VoiceZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 语音场
 */
export interface VoiceZone {
  id: string;
  name: string;
  bounds: VoiceZoneBounds;
  participants: string[]; // 参与者用户ID列表
  createdBy: string;
  createdAt: Date;
}

/**
 * 语音场创建参数
 */
export interface CreateVoiceZoneParams {
  name: string;
  bounds: VoiceZoneBounds;
}

