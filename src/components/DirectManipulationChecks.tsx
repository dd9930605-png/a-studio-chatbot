'use client';

import React, { useState } from 'react';
import { Condition } from '@/lib/conditions';
import { DirectCheckLevel, ParticipantData } from '@/lib/dataRecorder';
import { scoreDirectChecks } from '@/lib/directChecks';
import { ConversationRecap } from '@/components/ConversationRecap';

interface DirectManipulationChecksProps {
  condition: Condition;
  participantData: ParticipantData;
  onComplete: (next: ParticipantData) => void;
  onViewChatLog?: () => void;
}

export function DirectManipulationChecks({
  condition,
  participantData,
  onComplete,
  onViewChatLog,
}: DirectManipulationChecksProps) {
  const [explainability, setExplainability] = useState<DirectCheckLevel | ''>(
    participantData.directCheckExplainability,
  );
  const [twoSided, setTwoSided] = useState<DirectCheckLevel | ''>(
    participantData.directCheckTwoSided,
  );
  const [anthropomorphism, setAnthropomorphism] = useState<DirectCheckLevel | ''>(
    participantData.directCheckAnthropomorphism,
  );
  const [proactivity, setProactivity] = useState<DirectCheckLevel | ''>(
    participantData.directCheckProactivity,
  );
  const [recapOpen, setRecapOpen] = useState(false);

  const canFinish = Boolean(explainability && twoSided && anthropomorphism && proactivity);

  const handleFinish = () => {
    if (!explainability || !twoSided || !anthropomorphism || !proactivity) return;
    const answers = {
      directCheckExplainability: explainability,
      directCheckTwoSided: twoSided,
      directCheckAnthropomorphism: anthropomorphism,
      directCheckProactivity: proactivity,
    };
    const scored = scoreDirectChecks(answers, participantData.conditionInfo);
    onComplete({
      ...participantData,
      ...answers,
      ...scored,
      directCheckCompletedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="mt-8 space-y-8" data-testid="direct-manipulation-checks">
      <DirectCheckBlock
        testId="direct-check-ex"
        title="可解釋性"
        blurb="簡單來說，就是你看不看得出 AI 是怎麼從你的需求，一步一步推到最後這套推薦。"
        question="就上方的推薦說明來看，你覺得這次 AI 推薦的可解釋性較高還是較低？"
        hint="請參考上方推薦說明。"
        value={explainability}
        onChange={setExplainability}
        highCaption="看得出 AI 怎麼從我的需求、判斷到最後推薦這套。"
        lowCaption="主要看到穿搭資訊或推薦結果，看不太出 AI 是怎麼推到這套的。"
      />

      {explainability && (
        <DirectCheckBlock
          testId="direct-check-ts"
          title="雙面訊息"
          blurb="簡單來說，就是 AI 在推薦時，除了講這套衣服好的地方之外，有沒有也講到缺點或需要注意的地方。"
          question="就上方的穿搭評估資訊卡來看，你覺得這次推薦的雙面訊息程度較高還是較低？"
          hint="請參考上方的 AI 穿搭評估資訊卡。"
          value={twoSided}
          onChange={setTwoSided}
          highCaption="有講優點，也有提醒缺點或需要注意的地方。"
          lowCaption="主要都在講優點，沒有特別提醒缺點或限制。"
        />
      )}

      {explainability && twoSided && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
            你可以點選「查看完整對話紀錄」，回顧剛才與 AI 穿搭顧問的互動。
          </p>
          {!recapOpen ? (
            <button
              type="button"
              data-testid="open-conversation-recap"
              onClick={() => {
                setRecapOpen(true);
                onViewChatLog?.();
              }}
              className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-900"
            >
              查看完整對話紀錄
            </button>
          ) : (
            <ConversationRecap
              condition={condition}
              participantData={participantData}
              onView={onViewChatLog}
            />
          )}
        </section>
      )}

      {explainability && twoSided && recapOpen && (
        <DirectCheckBlock
          testId="direct-check-an"
          title="擬人化"
          blurb="簡單來說，就是你在跟 AI 互動時，覺得它講話和回應的方式像不像真人。"
          question="回看剛才的對話，你覺得這個 AI 的擬人化程度較高還是較低？"
          value={anthropomorphism}
          onChange={setAnthropomorphism}
          highCaption="互動和說話方式比較像真人。"
          lowCaption="互動和說話方式比較像系統或機器人。"
        />
      )}

      {explainability && twoSided && recapOpen && anthropomorphism && (
        <DirectCheckBlock
          testId="direct-check-pro"
          title="回應主動性"
          blurb="簡單來說，就是在你還沒有要求 AI 幫忙以前，它會不會自己先採取行動或提供協助。"
          question="就剛才『目前需求整理』的互動來看，你覺得 AI 的回應主動性較高還是較低？"
          hint="回答前，請回看完整對話紀錄，特別注意剛才『目前需求整理』是怎麼出現的。"
          value={proactivity}
          onChange={setProactivity}
          highCaption="我還沒有要求，AI 就先主動幫我整理需求。"
          lowCaption="我要自己點選『請 AI 整理目前需求』後，AI 才開始整理。"
        />
      )}

      {canFinish && recapOpen && (
        <button
          type="button"
          data-testid="direct-checks-continue"
          onClick={handleFinish}
          className="w-full rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white hover:bg-blue-800"
        >
          繼續
        </button>
      )}
    </div>
  );
}

function DirectCheckBlock({
  testId,
  title,
  blurb,
  question,
  hint,
  value,
  onChange,
  highCaption,
  lowCaption,
}: {
  testId: string;
  title: string;
  blurb: string;
  question: string;
  hint?: string;
  value: DirectCheckLevel | '';
  onChange: (next: DirectCheckLevel) => void;
  highCaption: string;
  lowCaption: string;
}) {
  return (
    <section data-testid={testId} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="text-lg font-bold text-slate-950">【{title}】</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{blurb}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
      <p className="mt-4 text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">{question}</p>
      <div className="mt-4 space-y-3">
        <Choice
          name={testId}
          checked={value === 'high'}
          onSelect={() => onChange('high')}
          label="較高"
          caption={highCaption}
        />
        <Choice
          name={testId}
          checked={value === 'low'}
          onSelect={() => onChange('low')}
          label="較低"
          caption={lowCaption}
        />
      </div>
    </section>
  );
}

function Choice({
  name,
  checked,
  onSelect,
  label,
  caption,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  caption: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
        checked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="mt-1"
      />
      <span>
        <span className="block font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-600">{caption}</span>
      </span>
    </label>
  );
}
