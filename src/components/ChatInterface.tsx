'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { isProactiveNoteMessage } from '@/lib/proactiveNotes';
import { extractChatPreferences } from '@/lib/chatPreferences';
import { ChatMessage, ParticipantData, extractUserMessages } from '@/lib/dataRecorder';
import { OverlayModal } from '@/components/OverlayModal';
import {
  PRO_SUMMARY_CTA_LABEL,
  PRO_SUMMARY_LOW_BUTTON,
  buildNeedSummaryFromParticipant,
  formatNeedSummary,
  proSummaryCtaMessage,
} from '@/lib/needSummary';

interface ChatInterfaceProps {
  participantData: ParticipantData;
  condition: Condition;
  onUpdateData: (data: ParticipantData) => void;
  chatLocked: boolean;
  minChatMs: number;
  maxChatMs: number;
  elapsedMs: number;
  minUserMessages?: number;
}

interface ChatApiResponse {
  relevant: boolean;
  reply: string;
  source: 'openai' | 'fallback';
}

function createMessage(
  step: string,
  sender: ChatMessage['sender'],
  message: string,
  kind: ChatMessage['kind'] = 'text',
): ChatMessage {
  return {
    step,
    sender,
    message,
    timestamp: new Date().toISOString(),
    kind,
  };
}

function isRejectionMessage(message: string): boolean {
  return (
    message.includes('抱歉') ||
    message.includes('無關') ||
    message.includes('過短') ||
    message.includes('提示：') ||
    message.includes('請重新輸入') ||
    message.includes('重新回答')
  );
}

function getBotBubbleClass(message: string, theme: ReturnType<typeof getConditionTheme>): string {
  if (isRejectionMessage(message)) {
    return 'border border-amber-300 bg-amber-50 text-amber-950';
  }
  if (isProactiveNoteMessage(message)) {
    return theme.chatBotNoteClass;
  }
  return theme.chatBotBubbleClass;
}

export function ChatInterface({
  participantData,
  condition,
  onUpdateData,
  chatLocked,
  minChatMs,
  maxChatMs,
  elapsedMs,
  minUserMessages = 3,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const theme = getConditionTheme(condition);
  const isHighProactivity = condition.proactivity === 'high';

  const userMessageCount =
    participantData.userMessageCount || extractUserMessages(participantData).length;
  const summaryUnlocked = userMessageCount >= 2;
  const remainingMinMs = Math.max(0, minChatMs - elapsedMs);
  const remainingMessages = Math.max(0, minUserMessages - userMessageCount);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedPercent = Math.min(100, (elapsedMs / maxChatMs) * 100);
  const minThresholdPercent = (minChatMs / maxChatMs) * 100;
  const metTime = elapsedMs >= minChatMs;
  const metMessages = userMessageCount >= minUserMessages;
  const timeStatus =
    elapsedMs >= maxChatMs && metMessages
      ? '已達 5 分鐘上限，請查看推薦結果。'
      : metTime && metMessages
        ? '已達基本互動時間與訊息數，現在可查看推薦結果。'
        : [
            !metMessages ? `尚需 ${remainingMessages} 則互動訊息` : null,
            !metTime ? `請至少再互動 ${Math.ceil(remainingMinMs / 1000)} 秒` : null,
          ]
            .filter(Boolean)
            .join('；') + '。';

  const openSummary = (initiator: 'ai' | 'user') => {
    const summary = buildNeedSummaryFromParticipant(participantData);
    const text = formatNeedSummary(summary);
    const now = new Date().toISOString();
    onUpdateData({
      ...participantData,
      proSummaryOpened: true,
      proSummaryOpenedAt: participantData.proSummaryOpenedAt ?? now,
      proSummaryOpenCount: (participantData.proSummaryOpenCount ?? 0) + 1,
      proSummaryContent: text,
      proSummaryTriggeredOnce: true,
      proSummaryInitiator: participantData.proSummaryInitiator || initiator,
      proSummaryEligibleAt: participantData.proSummaryEligibleAt ?? now,
    });
    setSummaryText(text);
    setSummaryOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const answer = inputValue.trim();
    if (!answer || isSubmitting || chatLocked) return;

    setIsSubmitting(true);
    setSubmitError('');

    const userMessage = createMessage('freeChat', 'user', answer);

    const livePreferences = extractChatPreferences([...extractUserMessages(participantData), answer]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'freeChat',
          question: 'free_chat',
          userInput: answer,
          conversationHistory: participantData.chatLog.slice(-12),
          canRevealFinalRecommendation: false,
          experimentContext: {
            selectedOutfitCategory: participantData.selectedOutfitCategory as 'male' | 'female',
            allowedOutfits: participantData.allowedOutfits,
            expectedOutfitBeforeAI: participantData.expectedOutfitBeforeAI,
            finalRecommendedOutfit: participantData.finalRecommendedOutfit,
            surpriseMode: participantData.surpriseMode as 'surprise' | 'no_surprise',
            chatPreferences: livePreferences,
          },
          condition: {
            conditionId: condition.conditionId,
            botName: condition.botName,
            anthropomorphism: condition.anthropomorphism,
            proactivity: condition.proactivity,
            explainability: condition.explainability,
            twoSidedMessage: condition.twoSidedMessage,
            tone: condition.tone,
            avatarType: condition.avatarType,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('AI 回覆服務暫時無法使用');
      }

      const result = (await response.json()) as ChatApiResponse;
      const botMessage = createMessage('freeChat', 'bot', result.reply);
      const additions = [userMessage, botMessage];
      const nextUserMessageCount =
        [...participantData.chatLog, userMessage].filter((message) => message.sender === 'user').length;
      const now = new Date().toISOString();
      let proPatch: Partial<ParticipantData> = {};

      if (isHighProactivity && nextUserMessageCount >= 2 && !participantData.proSummaryTriggeredOnce) {
        additions.push(
          createMessage(
            'freeChat',
            'bot',
            proSummaryCtaMessage(condition.anthropomorphism),
            'proSummaryCta',
          ),
        );
        proPatch = {
          proSummaryTriggeredOnce: true,
          proSummaryInitiator: 'ai',
          proSummaryEligibleAt: participantData.proSummaryEligibleAt ?? now,
        };
      } else if (nextUserMessageCount >= 2 && !participantData.proSummaryEligibleAt) {
        proPatch = { proSummaryEligibleAt: now };
      }

      const updatedData: ParticipantData = {
        ...participantData,
        ...proPatch,
        answers: {
          ...participantData.answers,
          usualStyleInput: participantData.answers.usualStyleInput
            ? `${participantData.answers.usualStyleInput}\n${answer}`
            : answer,
        },
        chatLog: [...participantData.chatLog, ...additions],
        userMessageCount: nextUserMessageCount,
      };

      onUpdateData(updatedData);
      setInputValue('');
    } catch {
      setSubmitError('送出失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitButtonClass = theme.isPersona
    ? 'rounded-xl bg-rose-500 px-6 py-3 font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50'
    : 'rounded-md bg-slate-700 px-6 py-3 font-mono font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={`flex flex-col ${theme.chatContainerClass}`}>
      <div
        className={`mx-4 mt-4 rounded-lg border px-3 py-2 text-sm ${
          metTime && metMessages
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        <p className="font-semibold">
          互動時間：{Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:
          {(elapsedSec % 60).toString().padStart(2, '0')} / 05:00
        </p>
        <p className="mt-1 font-semibold">
          互動訊息：{userMessageCount}/{minUserMessages}
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-white/70">
          <div
            className={`h-2 rounded-full transition-all ${metTime ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${elapsedPercent}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span>開始</span>
          <span>3:00 達標</span>
          <span>5:00 結束</span>
        </div>
        <div className="relative mt-1 h-0">
          <span
            className="absolute -top-6 h-3 w-0.5 bg-gray-500/60"
            style={{ left: `${minThresholdPercent}%` }}
          />
        </div>
        <p className="mt-1">{timeStatus}</p>
      </div>

      <div className="max-h-[32rem] flex-1 space-y-3 overflow-y-auto p-4 sm:space-y-4 sm:p-6">
        {participantData.chatLog
          .filter((message) => !isProactiveNoteMessage(message.message))
          .map((message, index) => (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 ${
                  message.sender === 'user' ? theme.chatUserBubbleClass : getBotBubbleClass(message.message, theme)
                }`}
                data-testid={message.kind === 'proSummaryCta' ? 'pro-summary-cta' : undefined}
              >
                <p>{message.message}</p>
                {message.kind === 'proSummaryCta' && (
                  <button
                    type="button"
                    onClick={() => openSummary('ai')}
                    className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm"
                  >
                    {PRO_SUMMARY_CTA_LABEL}
                  </button>
                )}
              </div>
            </div>
          ))}

        <div className="flex justify-start">
          <div className={`max-w-[85%] px-4 py-3 ${theme.chatBotBubbleClass}`}>
            <p className="font-semibold">
              請自由描述你的面試穿搭需求（風格、正式度、顏色、身形修飾、擔心點都可以）。
            </p>
            <p className={`mt-2 text-xs ${theme.isPersona ? 'text-rose-700' : 'font-mono text-slate-600'}`}>
              你可以像用 ChatGPT 一樣自由提問，我會根據你的需求持續回應。
            </p>
          </div>
        </div>
      </div>

      {!isHighProactivity && (
        <div className="px-4 pb-2">
          <button
            type="button"
            data-testid="pro-summary-low-button"
            disabled={!summaryUnlocked}
            onClick={() => {
              if (!summaryUnlocked) return;
              openSummary('user');
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {PRO_SUMMARY_LOW_BUTTON}
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`border-t p-4 ${theme.isPersona ? 'border-rose-100' : 'border-slate-300'}`}
      >
        {submitError && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</p>}
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={isSubmitting || chatLocked}
            className={`flex-1 border px-4 py-3 focus:outline-none disabled:bg-gray-100 ${
              theme.isPersona
                ? 'rounded-xl border-rose-200 focus:border-rose-400'
                : 'rounded-md border-slate-300 font-mono focus:border-slate-500'
            }`}
            placeholder={
              chatLocked ? '已達聊天上限，請查看推薦結果' : isSubmitting ? 'AI 正在思考回覆...' : '請輸入你的回答...'
            }
          />
          <button type="submit" disabled={!inputValue.trim() || isSubmitting || chatLocked} className={submitButtonClass}>
            {isSubmitting ? '處理中...' : '送出'}
          </button>
        </div>
      </form>

      <OverlayModal open={summaryOpen} title="目前需求整理" onClose={() => setSummaryOpen(false)}>
        <div data-testid="pro-summary-board" className="space-y-3">
          {summaryText.split('\n').map((line) => (
            <p key={line} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 sm:text-base">
              {line}
            </p>
          ))}
        </div>
      </OverlayModal>
    </div>
  );
}
