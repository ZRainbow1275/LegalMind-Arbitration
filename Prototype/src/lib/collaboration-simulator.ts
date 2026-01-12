// Simple UUID generator to avoid external dependency
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


export interface SimulatedUser {
    id: string;
    name: string;
    avatar?: string;
    color: string;
    role: 'arbitrator' | 'lawyer' | 'party' | 'viewer';
    status: 'online' | 'idle' | 'offline';
    lastActive: Date;
}

export interface UserCursor {
    userId: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    label?: string;
}

export interface CollaborationActivity {
    id: string;
    userId: string;
    userName: string;
    action: 'join' | 'leave' | 'select' | 'move' | 'edit' | 'comment';
    targetId?: string;
    targetName?: string;
    timestamp: Date;
    details?: string;
}

type Listener<T> = (data: T) => void;

export class CollaborationSimulator {
    private users: SimulatedUser[] = [];
    private cursors: Map<string, UserCursor> = new Map();
    private activities: CollaborationActivity[] = [];
    private listeners: Map<string, Set<Listener<any>>> = new Map();
    private intervalId: any = null;
    private isRunning = false;

    // Mock data for simulation
    private readonly mockUsers = [
        { name: '王仲裁员', role: 'arbitrator', color: '#9333ea' }, // Purple
        { name: '李律师 (申请人)', role: 'lawyer', color: '#2563eb' }, // Blue
        { name: '张律师 (被申请人)', role: 'lawyer', color: '#ea580c' }, // Orange
        { name: '陈助理', role: 'viewer', color: '#16a34a' }, // Green
    ] as const;

    constructor() {
        this.initializeUsers();
    }

    private initializeUsers() {
        // Start with 1 user online
        this.addUser(this.mockUsers[0]);
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[CollaborationSimulator] Started');

        // Main simulation loop (30fps for smooth cursors)
        this.intervalId = setInterval(() => {
            this.updateCursors();
            this.randomEvents();
        }, 33);
    }

    public stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[CollaborationSimulator] Stopped');
    }

    public getUsers(): SimulatedUser[] {
        return [...this.users];
    }

    public getCursors(): UserCursor[] {
        return Array.from(this.cursors.values());
    }

    public getActivities(): CollaborationActivity[] {
        return [...this.activities];
    }

    public on(event: 'users' | 'cursors' | 'activities', listener: Listener<any>) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(listener);
        return () => this.off(event, listener);
    }

    public off(event: string, listener: Listener<any>) {
        this.listeners.get(event)?.delete(listener);
    }

    private emit(event: 'users' | 'cursors' | 'activities', data: any) {
        this.listeners.get(event)?.forEach(listener => listener(data));
    }

    private addUser(mockUser: typeof this.mockUsers[number]) {
        const user: SimulatedUser = {
            id: uuidv4(),
            name: mockUser.name,
            color: mockUser.color,
            role: mockUser.role as any,
            status: 'online',
            lastActive: new Date()
        };

        this.users.push(user);
        this.cursors.set(user.id, {
            userId: user.id,
            x: Math.random() * 1000,
            y: Math.random() * 800,
            targetX: Math.random() * 1000,
            targetY: Math.random() * 800
        });

        this.addActivity({
            id: uuidv4(),
            userId: user.id,
            userName: user.name,
            action: 'join',
            timestamp: new Date(),
            details: '加入了协作空间'
        });

        this.emit('users', this.users);
    }

    private removeUser(userId: string) {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) return;

        const user = this.users[userIndex];
        this.users.splice(userIndex, 1);
        this.cursors.delete(userId);

        this.addActivity({
            id: uuidv4(),
            userId: user.id,
            userName: user.name,
            action: 'leave',
            timestamp: new Date(),
            details: '离开了协作空间'
        });

        this.emit('users', this.users);
    }

    private addActivity(activity: CollaborationActivity) {
        this.activities.unshift(activity);
        if (this.activities.length > 50) this.activities.pop();
        this.emit('activities', this.activities);
    }

    private updateCursors() {
        let changed = false;
        this.cursors.forEach(cursor => {
            // Simple lerp for smooth movement
            const dx = cursor.targetX - cursor.x;
            const dy = cursor.targetY - cursor.y;

            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                cursor.x += dx * 0.1;
                cursor.y += dy * 0.1;
                changed = true;
            } else {
                // Pick new target occasionally
                if (Math.random() < 0.02) {
                    cursor.targetX = Math.max(0, Math.min(2000, cursor.x + (Math.random() - 0.5) * 500));
                    cursor.targetY = Math.max(0, Math.min(1500, cursor.y + (Math.random() - 0.5) * 500));
                }
            }
        });

        if (changed) {
            this.emit('cursors', Array.from(this.cursors.values()));
        }
    }

    private randomEvents() {
        // 1% chance to add/remove user
        if (Math.random() < 0.005) {
            if (this.users.length < 4 && Math.random() > 0.3) {
                const available = this.mockUsers.filter(m => !this.users.find(u => u.name === m.name));
                if (available.length > 0) {
                    this.addUser(available[Math.floor(Math.random() * available.length)]);
                }
            } else if (this.users.length > 1) {
                this.removeUser(this.users[Math.floor(Math.random() * this.users.length)].id);
            }
        }

        // 2% chance for an activity
        if (Math.random() < 0.02 && this.users.length > 0) {
            const user = this.users[Math.floor(Math.random() * this.users.length)];
            const actions = ['select', 'move', 'edit', 'comment'] as const;
            const action = actions[Math.floor(Math.random() * actions.length)];

            let details = '';
            switch (action) {
                case 'select': details = '选中了节点'; break;
                case 'move': details = '移动了节点'; break;
                case 'edit': details = '修改了属性'; break;
                case 'comment': details = '发表了评论'; break;
            }

            this.addActivity({
                id: uuidv4(),
                userId: user.id,
                userName: user.name,
                action,
                timestamp: new Date(),
                details
            });
        }
    }
}

export const collaborationSimulator = new CollaborationSimulator();
