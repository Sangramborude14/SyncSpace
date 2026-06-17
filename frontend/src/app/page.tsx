'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@a/components/ui/button';
import {Sparkles, Paintbrush, ArrowRight} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const[name,setName] = useState("");
  const[boardIdInput,setBoardIdInput] = useState('');
  const[error,setError] = useState('');

  const handleCreateBoard = () => {
    if(!name.trim()){
      setError('Please enter your name');
      return;
    }

    const newBoardId = Math.random().toString(36).substring(2,9);
    router.push(`/board/${newBoardId}?name=${encodeURIComponent(name.trim())}`);
  };

  const handleJoinBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if(!name.trim()){
      setError('Please enter your name')
      return;
    }

    if(!boardIdInput.trim()){
      setError('Please enter a Board ID')
      return;
    }
    router.push(`/board/${boardIdInput.trim()}name=${encodeURIComponent(name.trim())}`)
  };

  return(
   <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900 p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">SyncSpace</h1>
          <p className="text-sm text-zinc-500">
            Collaborative, real-time vector drawing whiteboard.
          </p>
        </div>
        {/* Input & Form Area */}
        <div className="space-y-4">
          {/* User Name input */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md animate-none">
              {error}
            </p>
          )}
          {/* Action: Create Board */}
          <button
            onClick={handleCreateBoard}
            className="w-full rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Create New Board
          </button>
          {/* Separator */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <span className="relative bg-white px-3 text-xs text-zinc-400">
              or
            </span>
          </div>
          {/* Action: Join Board */}
          <form onSubmit={handleJoinBoard} className="space-y-2">
            <div className="space-y-1.5">
              <label htmlFor="boardId" className="text-sm font-medium text-zinc-700">
                Board ID
              </label>
              <div className="flex gap-2">
                <input
                  id="boardId"
                  type="text"
                  placeholder="Enter Board ID"
                  value={boardIdInput}
                  onChange={(e) => {
                    setBoardIdInput(e.target.value);
                    if (error) setError('');
                  }}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:border-zinc-900 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}