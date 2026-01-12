import { useEffect } from 'react';
import { useCursorStore } from '../../../stores/cursor-store';
import { collaborationSimulator, UserCursor as SimCursor } from '../../../lib/collaboration-simulator';

export const useCollaborationSync = () => {
    const { updateCursor } = useCursorStore();

    useEffect(() => {
        // 启动模拟器
        collaborationSimulator.start();

        // 订阅光标更新
        const unsubscribeCursors = collaborationSimulator.on('cursors', (cursors: SimCursor[]) => {
            const currentUsers = collaborationSimulator.getUsers();

            cursors.forEach(cursor => {
                const user = currentUsers.find(u => u.id === cursor.userId);
                if (user) {
                    updateCursor({
                        userId: cursor.userId,
                        position: { x: cursor.x, y: cursor.y },
                        userName: user.name,
                        userColor: user.color
                    });
                }
            });
        });

        return () => {
            unsubscribeCursors();
            // 注意：我们不停止模拟器，因为它是一个单例，可能被其他组件使用
            // collaborationSimulator.stop(); 
        };
    }, [updateCursor]);
};
