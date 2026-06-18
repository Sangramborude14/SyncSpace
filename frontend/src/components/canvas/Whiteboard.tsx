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
        setElements,
        clearBoard,
        undo,
        redo,
        zoom,
        pan,
        setZoom,
        setPan,

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
            addElement(element);
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
    if(selectedTool === 'select') return;

    setIsDrawing(true);

    const coords = getCanvasCoords(e.clientX, e.clientY);
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
    }
}

const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    socket.emit('MOVE_CURSOR',{boardId,position: coords});

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
    if(!isDrawing || ! currentElement) return;
    setIsDrawing(false);
    
    addElement(currentElement);

    socket.emit('DRAW', {boardId,element: currentElement});
    setCurrentElement(null);
};

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
            {(['pencil', 'rectangle', 'circle', 'arrow', 'text'] as DrawingTool[]).map((t) => (
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
            onClick={undo}
            className="rounded px-2.5 py-1 text-xs font-medium text-zinc-650 hover:bg-zinc-100 cursor-pointer"
          >
            Undo
          </button>
          <button
            onClick={redo}
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

