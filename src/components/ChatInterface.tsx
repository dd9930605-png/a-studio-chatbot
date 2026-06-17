'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { CHAT_PROMPTS, generateAcknowledgment } from '@/lib/aiResponses';
import { ChatMessage, ParticipantData } from '@/lib/dataRecorder';

interface ChatInterfaceProps {
  participantData: ParticipantData;
  condition: Condition;
  onUpdateData: (data: ParticipantData) => void;
  onStepChange: (step: string, data?: ParticipantData) => void;
  currentStep: string;
}

function createMessage(step: string, sender: ChatMessage['sender'], message: string): ChatMessage {
  return {
    step,
    sender,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function ChatInterface({
  participantData,
  condition,
  onUpdateData,
  onStepChange,
  currentStep,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const prompt = CHAT_PROMPTS[currentStep as keyof typeof CHAT_PROMPTS];

  if (!prompt) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const answer = inputValue.trim();
    if (!answer) return;

    const questionMessage = createMessage(currentStep, 'bot', prompt.question);
    const acknowledgment = generateAcknowledgment(
      currentStep as keyof typeof CHAT_PROMPTS,
      answer,
      condition,
    );
    const ackMessage = createMessage(currentStep, 'bot', acknowledgment);
    const userMessage = createMessage(currentStep, 'user', answer);

    const updatedData: ParticipantData = {
      ...participantData,
      answers: {
        ...participantData.answers,
        [prompt.answerKey]: answer,
      },
      chatLog: [...participantData.chatLog, questionMessage, userMessage, ackMessage],
    };

    onUpdateData(updatedData);
    setInputValue('');
    onStepChange(prompt.nextStep, updatedData);
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
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
            placeholder="請輸入你的回答..."
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="rounded-lg bg-blue-500 px-6 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            送出
          </button>
        </div>
      </form>
    </div>
  );
}
