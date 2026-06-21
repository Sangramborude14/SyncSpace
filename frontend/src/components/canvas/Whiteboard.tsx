'use client'

import React, {useRef, useEffect,useState} from 'react';
import {socket} from "@a/lib/socket";
import { drawElement } from '@a/utils/draw';
import { useToolStore,DrawingTool } from '@a/store/useToolStore';
import { useBoardStore,CanvasElement,Point } from '@a/store/useBoardStore';
import { usePresenceStore } from '@a/store/usePresenceStore';
import { clear } from 'console';

interface WhiteboardProps {
    boardId: string;
    username: string;
}

export default function Whiteboard({boardId,username}: WhiteboardProps){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing,setIsDrawing] = useState(false);
    const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanOffset, setLastPanOffset] = useState<Point>({x: 0, y: 0});
    const [selectedElement, setSelectedElement] = useState<CanvasElement | null>(null);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState<Point>({x: 0, y: 0});

    const {
        selectedTool,
        color,
        strokeWidth,
        setSelectedTool,
        setColor,
        setStrokeWidth,

    } = useToolStore();

    const {
        elements,
        addElement,
        deleteElement,
        updateElement,
        setElements,
        clearBoard,
        undo,
        redo,
        zoom,
        pan,
        setZoom,
        setPan,
        history,
        historyIndex,

    } = useBoardStore();

    const {
        onlineUsers,
        cursors,
        setOnlineUsers,
        updateCursor,
        removeCursor,
        clearPresence,

    } = usePresenceStore();

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if(e.code === 'Space' && !isSpacePressed){
          e.preventDefault();
          setIsSpacePressed(true);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if(e.code === 'Space'){
          setIsSpacePressed(false);
        }
      };

      window.addEventListener('keydown',handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      return () => {
        window.removeEventListener('keydown',handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };

    }, [isSpacePressed])

    useEffect(() => {
      const canvas = canvasRef.current;
      if(!canvas) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - pan.x) / zoom;
        const canvasY = (mouseY - pan.y) / zoom;

        const zoomFactor = 1.1;
        let newZoom = zoom;

        if(e.deltaY < 0){
          newZoom = Math.min(zoom * zoomFactor, 10);
        }else{
          newZoom = Math.max(zoom / zoomFactor, 0.1);
        }

        const newPanX = mouseX - canvasX * newZoom;
        const newPanY = mouseY - canvasY * newZoom;

        setZoom(newZoom);
        setPan({x: newPanX, y: newPanY})
      }
      canvas.addEventListener('wheel',handleWheel,{passive: false})
      return () => {
        canvas.removeEventListener('wheel',handleWheel);
      }
    },[zoom,pan,setZoom,setPan])

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight - 56;

            drawCanvas();
        }
        resizeCanvas();
        window.addEventListener('resize',resizeCanvas);
        return () => window.removeEventListener('resize',resizeCanvas);
    },[elements,zoom,pan])

    //redraw canvas on update
    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();

        //apply pan and zoom transform
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom,zoom);

        //draw each element
        elements.forEach((element) => drawElement(ctx,element))

        if(currentElement){
            drawElement(ctx,currentElement);
        }

        ctx.restore();
    };

    useEffect(() => {
        drawCanvas();
    },[elements,currentElement,zoom,pan])

    //socket-io setup

    useEffect(() => {
        socket.connect();
        socket.emit('JOIN_BOARD',{boardId,username})

        socket.on('USER_JOINED',({users}) => {
            setOnlineUsers(users);
        })

        socket.on('USER_LEFT',({users}) => {
            setOnlineUsers(users);
        })

        socket.on('ELEMENT_CREATED', ({ element }) => {
           const exists = useBoardStore.getState().elements.some(el => el.id === element.id);

           if(exists){
            updateElement(element.id,element);
           }else{
             addElement(element);
           }
        })

        socket.on('ELEMENT_UNDONE',({elementId}) => {
          deleteElement(elementId);
        })

        socket.on('CURSOR_MOVED',({userId, position}) => {
            updateCursor(userId,position)
        });
        
        socket.on('BOARD_CLEARED', () => {
            clearBoard();
        })

        return () => {
            socket.emit('LEAVE_BOARD', {boardId});
            socket.disconnect();
            socket.off('USER_JOINED')
            socket.off('USER_LEFT')
            socket.off('ELEMENT_CREATED')
            socket.off('ELEMENT_UNDONE')
            socket.off('CURSOR_MOVED')
            socket.off('BOARD_CLEARED');
            clearPresence();
        }
    },[boardId,username])

    // conver screen cordinate into canvas coordinate
const getCanvasCoords = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if(!canvas) return {x: 0, y:0};
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
    }
}
 
//drawing event handler
const handleMouseDown = (e: React.MouseEvent) => {

    if(isSpacePressed) {
      setIsPanning(true);
      setLastPanOffset({x: e.clientX, y: e.clientY});
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if(selectedTool === 'select') {
      const clickedElement = getElementAtPosition(coords.x,coords.y,elements);

      if(clickedElement){
        setSelectedElement(clickedElement);
        setIsDraggingElement(true);
        setLastPanOffset(coords);
      }
      return;
    };

    setIsDrawing(true);
    const elementId = Math.random().toString(36).substring(2,9);

    if(selectedTool === 'text'){
        const textVal = prompt('Enter your text:');
        if(textVal){
            const textElement: CanvasElement = {
                id: elementId,
                type: 'text',
                x: coords.x,
                y: coords.y,
                text: textVal,
                color,
                strokeWidth,
            }
            addElement(textElement);
            socket.emit('DRAW', {boardId,element: textElement});
        }
        setIsDrawing(false);
    }else{

      //Initalize drawing for shapes and pencil lines
      const newElement: CanvasElement = {
        id: elementId,
        type: selectedTool,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        points: selectedTool === 'pencil' ? [coords] :  undefined,
        color,
        strokeWidth,
      };
      setCurrentElement(newElement)
    }
}

const handleMouseMove = (e: React.MouseEvent) => {

    if(isPanning){
      const dx = e.clientX - lastPanOffset.x;
      const dy = e.clientY - lastPanOffset.y;

      setPan({
        x: pan.x + dx,
        y: pan.y + dy
      })
      setLastPanOffset({x:e.clientX, y:e.clientY})
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    socket.emit('MOVE_CURSOR',{boardId,position: coords});

    if(selectedTool === 'select' && isDraggingElement && selectedElement){
      const dx = coords.x - lastPanOffset.x;
      const dy = coords.y - lastPanOffset.y;

      const updatedElement: CanvasElement = {
        ...selectedElement,
        x: selectedElement.x + dx,
        y: selectedElement.y + dy,
        points: selectedElement.points ? selectedElement.points.map((p) => ({
          x: p.x + dx,
          y: p.y + dy
        })) : undefined,
      }

      updateElement(selectedElement.id, updatedElement);
      setSelectedElement(updatedElement);
      setLastPanOffset(coords);

      socket.emit('DRAW', {boardId,element: updatedElement});
      return;

    }


    if(!isDrawing || !currentElement) return;
    
    if(selectedTool === 'pencil'){
        const updatedPoints = [...(currentElement.points || []),coords];
        setCurrentElement({
            ...currentElement,
            points: updatedPoints,
        });
    }else{
        const width = coords.x - currentElement.x;
        const height = coords.y - currentElement.y;
        setCurrentElement({
            ...currentElement,
            height,
            width,
        })
    }
}

const handleMouseUp = (e: React.MouseEvent) => {

  if(isPanning){
    setIsPanning(false);
    return;
  }

  if(selectedTool === 'select'){
    setIsDraggingElement(false);
    setSelectedElement(null);
    return;
  }

    if(!isDrawing || ! currentElement) return;
    setIsDrawing(false);
    
    addElement(currentElement);

    socket.emit('DRAW', {boardId,element: currentElement});
    setCurrentElement(null);
};

const handleUndo = () => {
  if(elements.length === 0) return;
  const lastElement = elements[elements.length - 1];
  socket.emit('UNDO', {boardId, elementId: lastElement.id})
  undo();
}

const handleRedo = () => {
  if(historyIndex < history.length - 1){
    const nextElements = history[historyIndex + 1];
    const restoredElement = nextElements[nextElements.length - 1];
    if(restoredElement){
      redo();
      socket.emit('DRAW',{boardId,element: restoredElement})
    }
  }
}

const handleClear = () => {
    clearBoard();
    socket.emit('CLEAR_BOARD', {boardId});
}

return (
      <div className="flex h-screen flex-col overflow-hidden bg-zinc-50 font-sans text-zinc-900 select-none">
      {/* Top Navbar */}
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg">SyncSpace</span>
          <span className="text-xs text-zinc-400">|</span>
          <span className="text-xs font-mono bg-zinc-100 text-zinc-650 px-2 py-1 rounded">
            Board ID: {boardId}
          </span>
        </div>
        {/* Users list */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Online ({onlineUsers.length}):</span>
          <div className="flex -space-x-1">
            {onlineUsers.map((user) => (
              <span
                key={user.id}
                title={user.name}
                style={{ backgroundColor: user.color }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white uppercase border border-white"
              >
                {user.name.substring(0, 2)}
              </span>
            ))}
          </div>
        </div>
      </header>
      {/* Main Workspace */}
      <div className="relative flex-1 bg-zinc-100">
        {/* Simple Floating Toolbar */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-2.5 shadow-sm">
          {/* Tools selection */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 px-1">
              Tools
            </span>
            {(['select','pencil', 'rectangle', 'circle', 'arrow', 'text'] as DrawingTool[]).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTool(t)}
                className={`rounded px-2.5 py-1.5 text-left text-xs font-medium capitalize transition-colors cursor-pointer ${
                  selectedTool === t
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-650 hover:bg-zinc-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-150" />
          {/* Color Selection */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 px-1">
              Colors
            </span>
            <div className="flex gap-1.5 px-1 py-0.5">
              {['#000000', '#dc2626', '#2563eb', '#16a34a'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                    color === c ? 'scale-110 border-zinc-900' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-150" />
          {/* Stroke width */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 px-1">
              Width
            </span>
            <div className="flex gap-1 px-1">
              {[2, 4, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => setStrokeWidth(w)}
                  className={`rounded border px-2 py-0.5 text-xs font-medium cursor-pointer ${
                    strokeWidth === w
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Bottom Actions Toolbar */}
        <div className="absolute bottom-4 left-4 z-20 flex gap-2 rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm">
          <button
            onClick={handleUndo}
            className="rounded px-2.5 py-1 text-xs font-medium text-zinc-650 hover:bg-zinc-100 cursor-pointer"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            className="rounded px-2.5 py-1 text-xs font-medium text-zinc-650 hover:bg-zinc-100 cursor-pointer"
          >
            Redo
          </button>
          <div className="w-px bg-zinc-200 my-0.5" />
          <button
            onClick={handleClear}
            className="rounded px-2.5 py-1 text-xs font-medium text-red-650 hover:bg-red-50 hover:text-red-750 cursor-pointer"
          >
            Clear Board
          </button>
        </div>
        {/* Cursors Overlay */}
        {Object.entries(cursors).map(([userId, pos]) => {
          const user = onlineUsers.find((u) => u.id === userId);
          if (!user) return null;
          return (
            <div
              key={userId}
              style={{
                left: pos.x * zoom + pan.x,
                top: pos.y * zoom + pan.y,
              }}
              className="absolute pointer-events-none z-30 transition-all duration-75 flex items-center gap-1.5"
            >
              {/* Simple dot cursor */}
              <div
                style={{ backgroundColor: user.color }}
                className="h-2 w-2 rounded-full ring-2 ring-white"
              />
              <span
                style={{ backgroundColor: user.color }}
                className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white uppercase shadow-sm whitespace-nowrap"
              >
                {user.name}
              </span>
            </div>
          );
        })}
        {/* The Whiteboard Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="block h-full w-full bg-white cursor-crosshair"
        />
      </div>
    </div>
)
}

// Helper: Check if mouse point (px, py) is near line segment (x1, y1) to (x2, y2)
const isPointNearLine = (x1: number, y1: number, x2: number, y2: number, px: number, py: number, maxDistance = 8): boolean => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) < maxDistance;
};

// Helper: Determine which element is under the cursor (topmost first)
const getElementAtPosition = (x: number, y: number, elements: CanvasElement[]): CanvasElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        
        if (el.type === 'rectangle') {
            if (el.width === undefined || el.height === undefined) continue;
            const minX = Math.min(el.x, el.x + el.width);
            const maxX = Math.max(el.x, el.x + el.width);
            const minY = Math.min(el.y, el.y + el.height);
            const maxY = Math.max(el.y, el.y + el.height);
            
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                return el;
            }
        } else if (el.type === 'circle') {
            if (el.width === undefined || el.height === undefined) continue;
            const radius = Math.sqrt(el.width ** 2 + el.height ** 2) / 2;
            const centerX = el.x + el.width / 2;
            const centerY = el.y + el.height / 2;
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (dist <= radius + 5) {
                return el;
            }
        } else if (el.type === 'pencil') {
            if (!el.points) continue;
            for (let j = 0; j < el.points.length - 1; j++) {
                const p1 = el.points[j];
                const p2 = el.points[j + 1];
                if (isPointNearLine(p1.x, p1.y, p2.x, p2.y, x, y)) {
                    return el;
                }
            }
        } else if (el.type === 'arrow') {
            if (el.width === undefined || el.height === undefined) continue;
            if (isPointNearLine(el.x, el.y, el.x + el.width, el.y + el.height, x, y)) {
                return el;
            }
        } else if (el.type === 'text') {
            const textWidth = el.text ? el.text.length * (el.strokeWidth * 2 + 10) : 50;
            const textHeight = el.strokeWidth * 4 + 20;
            if (x >= el.x && x <= el.x + textWidth && y >= el.y - textHeight && y <= el.y) {
                return el;
            }
        }
    }
    return null;
};


