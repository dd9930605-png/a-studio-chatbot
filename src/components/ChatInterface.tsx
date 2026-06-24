'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { getConditionTheme } from '@/lib/conditionTheme';
import { CHAT_PROMPTS, ResponseStep } from '@/lib/aiResponses';
import { generateProactiveNote, isProactiveNoteMessage } from '@/lib/proactiveNotes';
import { ChatMessage, InvalidInputRecord, ParticipantData } from '@/lib/dataRecorder';

interface ChatInterfaceProps {
  participantData: ParticipantData;
  condition: Condition;
  onUpdateData: (data: ParticipantData) => void;
  onStepChange: (step: string, data?: ParticipantData) => void;
  currentStep: string;
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
  onStepChange,
  currentStep,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const theme = getConditionTheme(condition);
  const prompt = CHAT_PROMPTS[currentStep as ResponseStep];

  if (!prompt) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const answer = inputValue.trim();
    if (!answer || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');

    const step = currentStep as ResponseStep;
    const timestamp = new Date().toISOString();
    const userMessage = createMessage(currentStep, 'user', answer);

    const hasQuestionInLog = participantData.chatLog.some(
      (message) =>
        message.step === currentStep &&
        message.sender === 'bot' &&
        message.message === prompt.question,
    );
    const questionMessage = createMessage(currentStep, 'bot', prompt.question);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step,
          question: prompt.question,
          userInput: answer,
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
        const rejectionMessage = createMessage(currentStep, 'bot', result.reply);
        const invalidRecord: InvalidInputRecord = {
          step: currentStep,
          message: answer,
          timestamp,
        };

        const updatedData: ParticipantData = {
          ...participantData,
          invalidInputCount: participantData.invalidInputCount + 1,
          invalidInputs: [...participantData.invalidInputs, invalidRecord],
          chatLog: [
            ...participantData.chatLog,
            ...(hasQuestionInLog ? [] : [questionMessage]),
            userMessage,
            rejectionMessage,
          ],
        };

        onUpdateData(updatedData);
        setInputValue('');
        return;
      }

      const ackMessage = createMessage(currentStep, 'bot', result.reply);
      const proactiveNote =
        condition.proactivity === 'high'
          ? createMessage(currentStep, 'bot', generateProactiveNote(step, answer, condition))
          : null;
      const hadInvalidForStep = participantData.invalidInputs.some(
        (record) => record.step === currentStep,
      );
      const correctedRecord: InvalidInputRecord = {
        step: currentStep,
        message: answer,
        timestamp,
      };

      const updatedData: ParticipantData = {
        ...participantData,
        answers: {
          ...participantData.answers,
          [prompt.answerKey]: answer,
        },
        correctedInputs: hadInvalidForStep
          ? [...participantData.correctedInputs, correctedRecord]
          : participantData.correctedInputs,
        chatLog: [
          ...participantData.chatLog,
          ...(hasQuestionInLog ? [] : [questionMessage]),
          userMessage,
          ackMessage,
          ...(proactiveNote ? [proactiveNote] : []),
        ],
      };

      onUpdateData(updatedData);
      setInputValue('');
      onStepChange(prompt.nextStep, updatedData);
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
            <p className="font-semibold">{prompt.question}</p>
            {condition.proactivity === 'low' && (
              <p className={`mt-2 text-xs ${theme.isPersona ? 'text-rose-700' : 'font-mono text-slate-600'}`}>
                請針對上方問題簡短回答即可。
              </p>
            )}
            {condition.proactivity === 'high' && (
              <p className={`mt-2 text-xs ${theme.isPersona ? 'text-rose-700' : 'font-mono text-slate-600'}`}>
                回答後我會整理重點，協助你完成面試穿搭決策。
              </p>
            )}
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
            disabled={isSubmitting}
            className={`flex-1 border px-4 py-3 focus:outline-none disabled:bg-gray-100 ${
              theme.isPersona
                ? 'rounded-xl border-rose-200 focus:border-rose-400'
                : 'rounded-md border-slate-300 font-mono focus:border-slate-500'
            }`}
            placeholder={isSubmitting ? 'AI 正在思考回覆...' : '請輸入你的回答...'}
          />
          <button type="submit" disabled={!inputValue.trim() || isSubmitting} className={submitButtonClass}>
            {isSubmitting ? '處理中...' : '送出'}
          </button>
        </div>
      </form>
    </div>
  );
}
