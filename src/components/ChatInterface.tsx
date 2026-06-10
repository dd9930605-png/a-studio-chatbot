'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { ChatMessage, ParticipantData } from '@/lib/dataRecorder';

interface ChatInterfaceProps {
  participantData: ParticipantData;
  condition: Condition;
  onUpdateData: (data: ParticipantData) => void;
  onStepChange: (step: string, data?: ParticipantData) => void;
  currentStep: string;
}

const prompts: Record<string, { question: string; answerKey: keyof ParticipantData['answers']; nextStep: string }> = {
  stylePreference: {
    question: '你平常偏好的穿搭風格是什麼？例如簡約、正式、休閒或甜美。',
    answerKey: 'stylePreferenceInput',
    nextStep: 'bodyShape',
  },
  bodyShape: {
    question: '你希望穿搭如何修飾身形或呈現比例？',
    answerKey: 'bodyShapeInput',
    nextStep: 'koreanStylePreference',
  },
  koreanStylePreference: {
    question: '你對韓系面試穿搭有哪些期待？',
    answerKey: 'koreanStylePreferenceInput',
    nextStep: 'recommendation',
  },
};

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
  const prompt = prompts[currentStep];

  if (!prompt) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const answer = inputValue.trim();
    if (!answer) {
      return;
    }

    const botMessage = createMessage(currentStep, 'bot', prompt.question);
    const userMessage = createMessage(currentStep, 'user', answer);
    const updatedData: ParticipantData = {
      ...participantData,
      answers: {
        ...participantData.answers,
        [prompt.answerKey]: answer,
      },
      chatLog: [...participantData.chatLog, botMessage, userMessage],
      finalRecommendedOutfit:
        prompt.nextStep === 'recommendation'
          ? condition.finalRecommendedOutfit
          : participantData.finalRecommendedOutfit,
    };

    onUpdateData(updatedData);
    setInputValue('');
    onStepChange(prompt.nextStep, updatedData);
  };

  return (
    <div className="flex h-full flex-col rounded-lg bg-white shadow-lg">
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {participantData.chatLog.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
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
          <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-800">
            {prompt.question}
            {condition.proactivity === 'high' && (
              <p className="mt-2 text-sm text-gray-600">
                可以從顏色、版型、正式程度或你想呈現的形象來描述。
              </p>
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
