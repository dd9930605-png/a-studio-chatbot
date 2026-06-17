'use client';

import React from 'react';

interface BotHeaderProps {
  botName: string;
  avatarUrl: string;
  avatarType: 'persona' | 'robot';
  greeting: string;
}

export function BotHeader({ botName, avatarUrl, avatarType, greeting }: BotHeaderProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <div className="flex items-center gap-4">
        <img
          src={avatarUrl}
          alt={`${botName} avatar`}
          className="h-16 w-16 rounded-full border border-gray-200 object-cover"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{botName}</h1>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {avatarType === 'persona' ? '個人化顧問' : 'AI 系統'}
            </span>
          </div>
          <p className="mt-2 text-gray-700">{greeting}</p>
        </div>
      </div>
    </div>
  );
}
