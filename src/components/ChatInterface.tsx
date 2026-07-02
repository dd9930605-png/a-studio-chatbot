'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { generateProactiveNote, isProactiveNoteMessage } from '@/lib/proactiveNotes';
import { ChatMessage, InvalidInputRecord, ParticipantData } from '@/lib/dataRecorder';

interface ChatInterfaceProps {
  participantData: ParticipantData;
  condition: Condition;
  onUpdateData: (data: ParticipantData) => void;
  chatLocked: boolean;
  minChatMs: number;
  maxChatMs: number;
  elapsedMs: number;
}

interface ChatApiResponse {
  relevant: boolean;
  reply: string;
  source: 'openai' | 'fallback';
}

function createMessage(step: string, sender: ChatMessage['sender'], message: string): ChatMessage {
  return {
    step,
    sender,
    message,
    timestamp: new Date().toISOString(),
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
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const theme = getConditionTheme(condition);

  const remainingMinMs = Math.max(0, minChatMs - elapsedMs);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedPercent = Math.min(100, (elapsedMs / maxChatMs) * 100);
  const minThresholdPercent = (minChatMs / maxChatMs) * 100;
  const timeStatus =
    elapsedMs >= maxChatMs
      ? '已達 5 分鐘上限，請查看推薦結果。'
      : elapsedMs >= minChatMs
        ? '已達基本互動時間，現在可查看推薦結果。'
        : `請至少再互動 ${Math.ceil(remainingMinMs / 1000)} 秒。`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const answer = inputValue.trim();
    if (!answer || isSubmitting || chatLocked) return;

    setIsSubmitting(true);
    setSubmitError('');

    const timestamp = new Date().toISOString();
    const userMessage = createMessage('freeChat', 'user', answer);

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

      if (!result.relevant) {
        const rejectionMessage = createMessage('freeChat', 'bot', result.reply);
        const invalidRecord: InvalidInputRecord = {
          step: 'freeChat',
          message: answer,
          timestamp,
        };

        const updatedData: ParticipantData = {
          ...participantData,
          invalidInputCount: participantData.invalidInputCount + 1,
          invalidInputs: [...participantData.invalidInputs, invalidRecord],
          chatLog: [
            ...participantData.chatLog,
            userMessage,
            rejectionMessage,
          ],
        };

        onUpdateData(updatedData);
        setInputValue('');
        return;
      }

      const ackMessage = createMessage('freeChat', 'bot', result.reply);
      const proactiveNote =
        condition.proactivity === 'high'
          ? createMessage(
              'freeChat',
              'bot',
              generateProactiveNote('freeChat', answer, condition),
            )
          : null;
      const hadInvalidForStep = participantData.invalidInputs.some((record) => record.step === 'freeChat');
      const correctedRecord: InvalidInputRecord = {
        step: 'freeChat',
        message: answer,
        timestamp,
      };

      const updatedData: ParticipantData = {
        ...participantData,
        correctedInputs: hadInvalidForStep
          ? [...participantData.correctedInputs, correctedRecord]
          : participantData.correctedInputs,
        chatLog: [
          ...participantData.chatLog,
          userMessage,
          ackMessage,
          ...(proactiveNote ? [proactiveNote] : []),
        ],
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
          elapsedMs >= minChatMs
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        <p className="font-semibold">
          互動時間：{Math.floor(elapsedSec / 60).toString().padStart(2, '0')}:
          {(elapsedSec % 60).toString().padStart(2, '0')} / 05:00
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-white/70">
          <div
            className={`h-2 rounded-full transition-all ${
              elapsedMs >= minChatMs ? 'bg-green-500' : 'bg-amber-500'
            }`}
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
        {participantData.chatLog.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 ${
                message.sender === 'user'
                  ? theme.chatUserBubbleClass
                  : getBotBubbleClass(message.message, theme)
              }`}
            >
              {message.message}
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

      <form
        onSubmit={handleSubmit}
        className={`border-t p-4 ${theme.isPersona ? 'border-rose-100' : 'border-slate-300'}`}
      >
        {submitError && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</p>
        )}
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
              chatLocked
                ? '已達聊天上限，請查看推薦結果'
                : isSubmitting
                  ? 'AI 正在思考回覆...'
                  : '請輸入你的回答...'
            }
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSubmitting || chatLocked}
            className={submitButtonClass}
          >
            {isSubmitting ? '處理中...' : '送出'}
          </button>
        </div>
      </form>
    </div>
  );
}
