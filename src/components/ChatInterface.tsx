'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { CHAT_PROMPTS, ResponseStep } from '@/lib/aiResponses';
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

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-lg bg-white shadow-lg">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {participantData.chatLog.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : isRejectionMessage(message.message)
                    ? 'border border-amber-200 bg-amber-50 text-amber-900'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.message}
            </div>
          </div>
        ))}

        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-800">
            {prompt.question}
            {condition.proactivity === 'high' && (
              <p className="mt-2 text-sm text-gray-600">請以文字自由輸入你的回答。</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        {submitError && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{submitError}</p>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
            placeholder={isSubmitting ? 'AI 正在思考回覆...' : '請輸入你的回答...'}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSubmitting}
            className="rounded-lg bg-blue-500 px-6 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? '處理中...' : '送出'}
          </button>
        </div>
      </form>
    </div>
  );
}
