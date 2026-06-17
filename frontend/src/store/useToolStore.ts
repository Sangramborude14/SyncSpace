import {create} from 'zustand';

export type DrawingTool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'arrow' | 'text';

interface ToolState {
    selectedTool: DrawingTool;
    color: string;
    strokeWidth: number;
    setSelectedTool: (tool: DrawingTool) => void;
    setColor: (color: string) => void;
    setStrokeWidth: (width: number) => void;
}

export const useToolStore = create<ToolState>((set) => ({
    selectedTool: 'pencil',
    color: '#000000',
    strokeWidth: 2,
    setSelectedTool: (tool) => set({selectedTool: tool}),
    setColor: (color) => set({color}),
    setStrokeWidth: (width) => set({strokeWidth:width})
}))