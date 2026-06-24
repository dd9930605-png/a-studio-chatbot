'use client';

import React from 'react';
import { Condition } from '@/lib/conditions';
import {
  getConditionAvatarUrl,
  getConditionDisplayName,
  getConditionTheme,
} from '@/lib/conditionTheme';

interface BotHeaderProps {
  condition: Condition;
  greeting: string;
}

export function BotHeader({ condition, greeting }: BotHeaderProps) {
  const theme = getConditionTheme(condition);
  const displayName = getConditionDisplayName(condition);

  return (
    <div className={`p-6 shadow-lg ${theme.headerClass}`}>
      <div className="flex items-center gap-5">
        <img
          src={getConditionAvatarUrl(condition)}
          alt={`${displayName} avatar`}
          className={theme.avatarClass}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`text-2xl font-bold ${theme.isPersona ? 'text-rose-950' : 'font-mono text-slate-900'}`}>
              {displayName}
            </h1>
            <span className={theme.headerBadgeClass}>
              {theme.isPersona ? '個人化顧問' : '自動化系統'}
            </span>
          </div>
          <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${theme.isPersona ? 'text-rose-600' : 'font-mono text-slate-500'}`}>
            {theme.headerSubtitle}
          </p>
          <p className={`mt-3 leading-relaxed ${theme.isPersona ? 'text-rose-900' : 'text-slate-800'}`}>
            {greeting}
          </p>
        </div>
      </div>
    </div>
  );
}
