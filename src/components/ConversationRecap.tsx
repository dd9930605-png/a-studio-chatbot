'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import {
  getConditionAvatarFallbackUrl,
  getConditionAvatarUrl,
  getConditionDisplayName,
  getConditionTheme,
} from '@/lib/conditionTheme';
import { ChatMessage, ParticipantData } from '@/lib/dataRecorder';
import { isProactiveNoteMessage } from '@/lib/proactiveNotes';
import { OverlayModal } from '@/components/OverlayModal';
import {
  PRO_SUMMARY_CTA_LABEL,
  PRO_SUMMARY_LOW_BUTTON,
  PRO_SUMMARY_USER_ACTION,
} from '@/lib/needSummary';

interface ConversationRecapProps {
  condition: Condition;
  participantData: ParticipantData;
  chatLog?: ChatMessage[];
  onView?: () => void;
}

export function ConversationRecap({
  condition,
  participantData,
  chatLog,
  onView,
}: ConversationRecapProps) {
  const [enlarged, setEnlarged] = useState(false);

  return (
    <div className="space-y-3" data-testid="conversation-recap">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">完整對話紀錄</p>
        <button
          type="button"
          data-testid="conversation-recap-enlarge"
          onClick={() => {
            setEnlarged(true);
            onView?.();
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          放大查看
        </button>
      </div>
      <ConversationRecapThread
        condition={condition}
        participantData={participantData}
        chatLog={chatLog}
        compact
      />
      <OverlayModal
        open={enlarged}
        title="完整對話紀錄"
        size="reading"
        onClose={() => setEnlarged(false)}
      >
        <ConversationRecapThread
          condition={condition}
          participantData={participantData}
          chatLog={chatLog}
        />
      </OverlayModal>
    </div>
  );
}

function ConversationRecapThread({
  condition,
  participantData,
  chatLog,
  compact = false,
}: {
  condition: Condition;
  participantData: ParticipantData;
  chatLog?: ChatMessage[];
  compact?: boolean;
}) {
  const theme = getConditionTheme(condition);
  const displayName = getConditionDisplayName(condition);
  const [avatarSrc, setAvatarSrc] = useState(getConditionAvatarUrl(condition));
  const messages = (chatLog ?? participantData.chatLog).filter(
    (message) => !isProactiveNoteMessage(message.message),
  );
  const boardText = participantData.proSummaryContent;
  const showBoardAfter = (message: ChatMessage) =>
    Boolean(boardText) &&
    (message.kind === 'proSummaryCta' || message.kind === 'proSummaryUserAction');

  return (
    <div className={`${theme.chatContainerClass} ${compact ? 'max-h-[28rem] overflow-y-auto' : ''}`}>
      <div className={`flex items-center gap-3 border-b px-4 py-3 ${theme.isPersona ? 'border-rose-100' : 'border-slate-200'}`}>
        <img
          src={avatarSrc}
          alt={`${displayName} avatar`}
          onError={() => {
            const fallback = getConditionAvatarFallbackUrl(condition);
            if (avatarSrc !== fallback) setAvatarSrc(fallback);
          }}
          className={`${theme.avatarClass} h-10 w-10`}
        />
        <div>
          <p className={`text-sm font-bold ${theme.isPersona ? 'text-rose-950' : 'font-mono text-slate-900'}`}>
            {displayName}
          </p>
          <p className={`text-xs ${theme.isPersona ? 'text-rose-600' : 'font-mono text-slate-500'}`}>
            {theme.headerSubtitle}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-600">目前沒有可顯示的對話紀錄。</p>
        ) : (
          messages.map((message, index) => (
            <div key={`${message.timestamp}-${index}`}>
              {message.sender === 'system' || message.kind === 'proSummaryUserAction' ? (
                <div
                  data-testid="pro-summary-user-action"
                  className="mx-auto max-w-[92%] rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs text-slate-700 sm:text-sm"
                >
                  {message.message || PRO_SUMMARY_USER_ACTION}
                </div>
              ) : (
                <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {message.sender === 'bot' && (
                    <img
                      src={avatarSrc}
                      alt=""
                      className={`${theme.avatarClass} mt-1 h-8 w-8 shrink-0`}
                    />
                  )}
                  <div
                    className={`max-w-[85%] px-4 py-3 ${
                      message.sender === 'user' ? theme.chatUserBubbleClass : theme.chatBotBubbleClass
                    }`}
                    data-testid={message.kind === 'proSummaryCta' ? 'pro-summary-cta' : undefined}
                  >
                    {message.sender === 'bot' && (
                      <p className="mb-1 text-xs font-semibold opacity-70">{displayName}</p>
                    )}
                    {message.sender === 'user' && (
                      <p className="mb-1 text-xs font-semibold opacity-70">你</p>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{message.message}</p>
                    {message.kind === 'proSummaryCta' && (
                      <p className="mt-3 inline-block rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm">
                        {PRO_SUMMARY_CTA_LABEL}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {showBoardAfter(message) && <NeedSummaryBoard text={boardText} />}
            </div>
          ))
        )}
        {condition.proactivity === 'low' &&
          !messages.some((message) => message.kind === 'proSummaryUserAction') &&
          participantData.proSummaryOpened && (
            <>
              <div
                data-testid="pro-summary-user-action"
                className="mx-auto max-w-[92%] rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs text-slate-700 sm:text-sm"
              >
                {PRO_SUMMARY_USER_ACTION}
              </div>
              {boardText ? <NeedSummaryBoard text={boardText} /> : null}
            </>
          )}
        {condition.proactivity === 'high' &&
          !messages.some((message) => message.kind === 'proSummaryCta') &&
          boardText && <NeedSummaryBoard text={boardText} />}
      </div>
      {condition.proactivity === 'low' && (
        <p className="px-4 pb-3 text-xs text-slate-500">操作：「{PRO_SUMMARY_LOW_BUTTON}」由你先發起。</p>
      )}
    </div>
  );
}

function NeedSummaryBoard({ text }: { text: string }) {
  return (
    <div data-testid="pro-summary-board" className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">目前需求整理</p>
      {text.split('\n').map((line) => (
        <p key={line} className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-900">
          {line}
        </p>
      ))}
    </div>
  );
}
