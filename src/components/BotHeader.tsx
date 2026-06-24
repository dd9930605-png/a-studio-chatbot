'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import {
  getConditionAvatarFallbackUrl,
  getConditionAvatarUrl,
  getConditionDisplayName,
  getConditionTheme,
} from '@/lib/conditionTheme';

interface BotHeaderProps {
  condition: Condition;
  greeting?: string;
  variant?: 'full' | 'compact';
}

export function BotHeader({ condition, greeting, variant = 'full' }: BotHeaderProps) {
  const theme = getConditionTheme(condition);
  const displayName = getConditionDisplayName(condition);
  const isCompact = variant === 'compact';
  const [avatarSrc, setAvatarSrc] = useState(getConditionAvatarUrl(condition));

  const handleAvatarError = () => {
    const fallback = getConditionAvatarFallbackUrl(condition);
    if (avatarSrc !== fallback) {
      setAvatarSrc(fallback);
    }
  };

  return (
    <div className={`shadow-lg ${theme.headerClass} ${isCompact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center sm:justify-start">
          <img
            src={avatarSrc}
            alt={`${displayName} avatar`}
            onError={handleAvatarError}
            className={`${theme.avatarClass} ${isCompact ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-16 w-16 sm:h-20 sm:w-20'}`}
          />
        </div>

        <div className="min-w-0 w-full flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1
              className={`text-center text-xl font-bold sm:text-left sm:text-2xl ${
                theme.isPersona ? 'text-rose-950' : 'font-mono text-slate-900'
              }`}
            >
              {displayName}
            </h1>
            <span className={theme.headerBadgeClass}>
              {theme.isPersona ? '個人化顧問' : '自動化系統'}
            </span>
          </div>

          {!isCompact && (
            <>
              <p
                className={`mt-1 text-center text-xs font-semibold sm:text-left ${
                  theme.isPersona ? 'text-rose-600' : 'font-mono uppercase tracking-wider text-slate-500'
                }`}
              >
                {theme.headerSubtitle}
              </p>
              {greeting && (
                <p
                  className={`mt-3 break-words text-center text-sm leading-relaxed sm:text-left sm:text-base ${
                    theme.isPersona ? 'text-rose-900' : 'text-slate-800'
                  }`}
                >
                  {greeting}
                </p>
              )}
            </>
          )}

          {isCompact && (
            <p
              className={`mt-2 text-center text-xs sm:text-left ${
                theme.isPersona ? 'text-rose-700' : 'font-mono text-slate-500'
              }`}
            >
              {theme.isPersona ? '正在與你對話中' : '對話進行中 · 系統記錄中'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
