/**
 * 语音场渲染组件
 * 显示语音讨论区边界和参与者
 */

import React from 'react';
import { Mic, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useVoiceZoneStore } from '../../stores/voice-zone-store';
import type { VoiceZone } from '../../types/voice-zone';

interface VoiceZoneRendererProps {
  scale: number; // 画布缩放比例
}

/**
 * 单个语音场组件
 */
const VoiceZoneComponent: React.FC<{ zone: VoiceZone; scale: number; isActive: boolean }> = ({
  zone,
  scale,
  isActive,
}) => {
  const { deleteZone, leaveZone, currentUserId } = useVoiceZoneStore();
  
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${zone.bounds.x}px`,
    top: `${zone.bounds.y}px`,
    width: `${zone.bounds.width}px`,
    height: `${zone.bounds.height}px`,
    pointerEvents: 'auto',
  };
  
  // 处理删除语音场
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除语音场"${zone.name}"吗？`)) {
      deleteZone(zone.id);
    }
  };
  
  // 处理离开语音场
  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    leaveZone(zone.id, currentUserId);
  };
  
  return (
    <div style={style} className="voice-zone">
      {/* 语音场边界（虚线矩形） */}
      <div
        className={`
          absolute inset-0 rounded-lg
          border-2 border-dashed
          ${isActive ? 'border-orange-500 bg-orange-50/20' : 'border-purple-500 bg-purple-50/10'}
          transition-all duration-200
        `}
        style={{
          boxShadow: isActive ? '0 0 20px rgba(255, 107, 53, 0.3)' : '0 0 10px rgba(168, 85, 247, 0.2)',
        }}
      />
      
      {/* 语音场标题栏 */}
      <div
        className="absolute -top-10 left-0 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-md"
        style={{
          backgroundColor: isActive ? '#FF6B35' : '#A855F7',
          transform: `scale(${1 / scale})`, // 反向缩放，保持标题栏大小不变
          transformOrigin: 'bottom left',
        }}
      >
        <Mic className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">{zone.name}</span>
        <span className="text-xs text-white/80">({zone.participants.length}人)</span>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-1 ml-2">
          {zone.createdBy === currentUserId ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-6 w-6 hover:bg-white/20 text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              className="h-6 px-2 text-xs hover:bg-white/20 text-white"
            >
              离开
            </Button>
          )}
        </div>
      </div>
      
      {/* 参与者头像列表 */}
      <div
        className="absolute -bottom-8 left-0 flex gap-1"
        style={{
          transform: `scale(${1 / scale})`, // 反向缩放，保持头像大小不变
          transformOrigin: 'top left',
        }}
      >
        {zone.participants.slice(0, 5).map((participantId, index) => (
          <div
            key={participantId}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-md"
            title={`用户${participantId.slice(0, 4)}`}
          >
            {index + 1}
          </div>
        ))}
        {zone.participants.length > 5 && (
          <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold shadow-md">
            +{zone.participants.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 语音场渲染器组件
 */
export const VoiceZoneRenderer: React.FC<VoiceZoneRendererProps> = ({ scale }) => {
  const { zones, activeZoneId } = useVoiceZoneStore();
  
  if (zones.length === 0) {
    return null;
  }
  
  return (
    <>
      {zones.map((zone) => (
        <VoiceZoneComponent
          key={zone.id}
          zone={zone}
          scale={scale}
          isActive={activeZoneId === zone.id}
        />
      ))}
    </>
  );
};

VoiceZoneRenderer.displayName = 'VoiceZoneRenderer';

