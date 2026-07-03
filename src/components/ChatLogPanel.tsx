'use client';

import React, { useState } from 'react';
import { ChatMessage } from '@/lib/dataRecorder';
import { isProactiveNoteMessage } from '@/lib/proactiveNotes';

interface ChatLogPanelProps {
  chatLog: ChatMessage[];
  defaultOpen?: boolean;
  buttonLabel?: string;
  onToggle?: (open: boolean) => void;
}

export function ChatLogPanel({
  chatLog,
  defaultOpen = false,
  buttonLabel = '查看剛才的對話紀錄',
  onToggle,
}: ChatLogPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const visibleMessages = chatLog.filter((message) => !isProactiveNoteMessage(message.message));

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    onToggle?.(next);
  };

  if (visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
      >
        <span>{buttonLabel}</span>
        <span className="text-gray-500">{open ? '收起 ▲' : '展開 ▼'}</span>
      </button>

      {open && (
        <div className="max-h-80 space-y-2 overflow-y-auto border-t border-gray-100 px-4 py-3">
          {visibleMessages.map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`rounded-lg px-3 py-2 text-sm ${
                message.sender === 'user'
                  ? 'ml-8 bg-slate-800 text-white'
                  : 'mr-8 border border-gray-200 bg-gray-50 text-gray-900'
              }`}
            >
              {message.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
