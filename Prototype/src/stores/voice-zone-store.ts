/**
 * 语音场系统状态管理
 * 使用Zustand管理语音讨论区状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoiceZone, CreateVoiceZoneParams } from '../types/voice-zone';

/**
 * 语音场Store接口
 */
interface VoiceZoneStore {
  // 状态
  zones: VoiceZone[];
  activeZoneId: string | null;
  currentUserId: string; // 当前用户ID

  // Actions
  createZone: (params: CreateVoiceZoneParams) => string; // 返回新语音场ID
  deleteZone: (id: string) => void;
  joinZone: (id: string, userId: string) => void;
  leaveZone: (id: string, userId: string) => void;
  setActiveZone: (id: string | null) => void;

  // Getters
  getZone: (id: string) => VoiceZone | undefined;
  getUserZones: (userId: string) => VoiceZone[]; // 获取用户参与的所有语音场
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `voice-zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 创建语音场Store
 */
export const useVoiceZoneStore = create<VoiceZoneStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      zones: [],
      activeZoneId: null,
      currentUserId: 'user-1', // 默认用户ID

      // 创建语音场
      createZone: (params: CreateVoiceZoneParams) => {
        const newZone: VoiceZone = {
          id: generateId(),
          name: params.name,
          bounds: params.bounds,
          participants: [get().currentUserId], // 创建者自动加入
          createdBy: get().currentUserId,
          createdAt: new Date(),
        };

        set((state) => ({
          zones: [...state.zones, newZone],
          activeZoneId: newZone.id,
        }));


        return newZone.id;
      },

      // 删除语音场
      deleteZone: (id: string) => {
        set((state) => ({
          zones: state.zones.filter((zone) => zone.id !== id),
          activeZoneId: state.activeZoneId === id ? null : state.activeZoneId,
        }));


      },

      // 加入语音场
      joinZone: (id: string, userId: string) => {
        set((state) => ({
          zones: state.zones.map((zone) =>
            zone.id === id && !zone.participants.includes(userId)
              ? { ...zone, participants: [...zone.participants, userId] }
              : zone
          ),
        }));


      },

      // 离开语音场
      leaveZone: (id: string, userId: string) => {
        set((state) => ({
          zones: state.zones.map((zone) =>
            zone.id === id
              ? { ...zone, participants: zone.participants.filter((p) => p !== userId) }
              : zone
          ),
        }));


      },

      // 设置活动语音场
      setActiveZone: (id: string | null) => {
        set({ activeZoneId: id });

      },

      // 获取语音场
      getZone: (id: string) => {
        return get().zones.find((zone) => zone.id === id);
      },

      // 获取用户参与的所有语音场
      getUserZones: (userId: string) => {
        return get().zones.filter((zone) => zone.participants.includes(userId));
      },
    }),
    {
      name: 'legalmind-voice-zone-storage',
      // 只持久化语音场数据，不持久化UI状态
      partialize: (state) => ({
        zones: state.zones,
        currentUserId: state.currentUserId,
      }),
    }
  )
);

