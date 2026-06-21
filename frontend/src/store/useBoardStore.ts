import {create} from 'zustand';

export interface Point {
    x: number;
    y: number;
}

export interface CanvasElement {
    id: string;
    type: 'pencil' | 'rectangle' | 'circle' | 'arrow' | 'text';
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: Point[];
    text?: string;
    color: string;
    strokeWidth: number;
}

interface BoardState {
    boardId: string | null;
    elements: CanvasElement[];
    selectedElementIds: string[];
    zoom: number;
    pan: Point;
    history: CanvasElement[][];
    historyIndex: number;

    setBoardId: (id: string | null) => void;
    setElements: (element: CanvasElement[], addToHistory?: boolean) => void;
    addElement: (element: CanvasElement) => void;
    updateElement: (id:string,updates: Partial<CanvasElement>) => void;
    deleteElement: (id: string) => void;
    setSelectedElementIds: (ids: string[]) => void;
    setZoom: (zoom: number) => void;
    setPan: (pan: Point) => void;
    clearBoard: () => void;
    undo: () => void;
    redo: () => void;
    }

export const useBoardStore = create<BoardState>((set,get) => ({
    boardId: null,
    elements: [],
    selectedElementIds: [],
    zoom: 1,
    pan: {x: 0, y: 0},
    history: [[]],
    historyIndex: 0,

    setBoardId: (id) => set({boardId: id}),
    
    setElements: (newElements, addToHistory = true) => {
        const {history,historyIndex} = get();
        if(addToHistory){
            const nextHistory = history.slice(0,historyIndex+1);

            set({elements: newElements,
                history: [...nextHistory, newElements],
                historyIndex: nextHistory.length,
            })
        }else{
            set({elements: newElements})
        }

    },

    addElement: (element) => {
        const { elements} = get();
        const newElements = [...elements, element];
        get().setElements(newElements);
    },

    updateElement: (id,updates) => {
        const {elements} = get();
        const newElements = elements.map((el) => el.id === id ? { ...el, ...updates}: el);
        get().setElements(newElements);
    },
    deleteElement: (id) => {
        const {elements} = get();
        const newElements = elements.filter((el) => el.id !== id);
        get().setElements(newElements)
    },
    setSelectedElementIds: (ids) => set({
        selectedElementIds: ids
    }),
    setZoom: (zoom) => set({zoom}),
    setPan: (pan) => set({pan}),

    clearBoard: () => {
        get().setElements([]);
    },
    
    undo: () => {
        const {history, historyIndex} = get();
        if(historyIndex > 0){
            const nextIndex = historyIndex - 1;
            set({
                historyIndex: nextIndex,
                elements: history[nextIndex],
            })
        }
    },
    redo: () => {
        const {history, historyIndex} = get();
        if(historyIndex < history.length - 1){
            const nextIndex = historyIndex + 1;
            set({
                historyIndex: nextIndex,
                elements: history[nextIndex]
            })
        }
    },

}))