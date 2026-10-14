'use client';

import React from 'react';
import { ResultContent, buildResultParagraph } from '@/lib/resultContent';

interface ResultExplanationViewProps {
  content: ResultContent;
  explainability: 'high' | 'low';
  twoSidedMessage: 'high' | 'low';
  layout: 'card' | 'paragraph';
}

export function ResultExplanationView({
  content,
  explainability,
  twoSidedMessage,
  layout,
}: ResultExplanationViewProps) {
  if (layout === 'paragraph') {
    const paragraph = buildResultParagraph(content, explainability, twoSidedMessage);
    return (
      <div data-testid="result-layout" data-layout="paragraph" data-ex={explainability} data-ts={twoSidedMessage}>
        <p
          data-testid="result-paragraph"
          className="text-base leading-[1.9] text-slate-800 sm:text-lg"
        >
          {paragraph}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="result-layout"
      data-layout="card"
      data-ex={explainability}
      data-ts={twoSidedMessage}
      className="space-y-6"
    >
      <section data-testid="ex-block">
        {explainability === 'high' ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <FlowCard title="你的需求" testId="ex-need">
              <p>{content.userNeed1}</p>
              <p className="mt-2">{content.userNeed2}</p>
            </FlowCard>
            <FlowArrow />
            <FlowCard title="AI 判斷重點" testId="ex-judgment">
              <p>{content.judgmentPoint1}</p>
              <p className="mt-2">{content.judgmentPoint2}</p>
            </FlowCard>
            <FlowArrow />
            <FlowCard title="本次推薦" testId="ex-recommendation">
              <p>
                {content.finalLookLabel}
                <span className="mt-2 block">{content.finalLookName}</span>
              </p>
            </FlowCard>
          </div>
        ) : (
          <div data-testid="ex-low">
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <FlowCard title="色系" testId="ex-color">
                {content.neutralLookAttribute1}
              </FlowCard>
              <FlowCard title="版型" testId="ex-fit">
                {content.neutralLookAttribute2}
              </FlowCard>
              <FlowCard title="整體風格" testId="ex-style">
                {content.neutralLookAttribute3}
              </FlowCard>
            </div>
            <p data-testid="ex-recommendation" className="mt-3 text-center text-base font-bold text-slate-900">
              本次推薦：{content.finalLookLabel}
            </p>
          </div>
        )}
      </section>

      <section data-testid="ts-block">
        <h3 className="text-lg font-bold text-slate-950">AI 穿搭評估</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <EvalRow mark="✓" title="推薦亮點" body={content.positiveA} testId="ts-positive-a" />
          {twoSidedMessage === 'high' ? (
            <EvalRow mark="△" title="需要注意" body={content.caution} testId="ts-caution" />
          ) : (
            <EvalRow mark="✓" title="另一項亮點" body={content.positiveB} testId="ts-positive-b" />
          )}
        </div>
      </section>
    </div>
  );
}

function FlowCard({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex h-full min-h-[7.5rem] flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <h4 className="text-sm font-bold text-slate-950">{title}</h4>
      <div className="mt-2 text-sm leading-relaxed text-slate-800 sm:text-base">{children}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div data-testid="ex-arrow" className="flex items-center justify-center text-2xl text-slate-400" aria-hidden>
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </div>
  );
}

function EvalRow({
  mark,
  title,
  body,
  testId,
}: {
  mark: string;
  title: string;
  body: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex h-full min-h-[8.5rem] flex-col rounded-xl border border-slate-200 bg-white p-4"
    >
      <h4 className="text-sm font-bold text-slate-950">
        <span className="mr-1" aria-hidden>
          {mark}
        </span>
        {title}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-800 sm:text-base">{body}</p>
    </div>
  );
}
