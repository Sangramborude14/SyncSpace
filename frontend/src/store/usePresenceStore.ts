import { create } from 'zustand';

export interface Point {
    x: number;
    y: number;
}

export interface OnlineUser {
    id: string,
    name: string,
    color: string,
}

interface PresenceState{
    onlineUsers: OnlineUser[];
    cursors: Record<string,Point>;

    setOnlineUsers: (users: OnlineUser[]) => void;
    updateCursor: (userId: string, position: Point) => void;
    removeCursor: (userId: string) => void;
    clearPresence: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
    onlineUsers: [],
    cursors: {},

    setOnlineUsers: (users) => set({onlineUsers:users}),

    updateCursor: (userId,positon) => set((state) => ({
        cursors: {
            ...state.cursors,
            [userId]: positon,
        },
    })),
    
    removeCursor: (userId) => set((state) => {
        const nextCursors = { ...state.cursors};
        delete nextCursors[userId];
        return {cursors: nextCursors};
    }),
    
    clearPresence: () => set({ onlineUsers: [], cursors: {}})
}))