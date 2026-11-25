'use client';

import React from 'react';

export type EmmaPresenceState = 'idle' | 'listening' | 'thinking' | 'responding';

interface EmmaPresenceProps {
  state: EmmaPresenceState;
}

const EMMA_STATE_IMAGES: Record<EmmaPresenceState, string> = {
  idle: '/images/avatars/emma-states/idle.webp',
  listening: '/images/avatars/emma-states/listening.webp',
  thinking: '/images/avatars/emma-states/thinking.webp',
  responding: '/images/avatars/emma-states/responding.webp',
};

export function EmmaPresence({ state }: EmmaPresenceProps) {
  return (
    <aside
      role="img"
      aria-label="Emma，AI 穿搭顧問"
      data-testid="emma-presence"
      data-emma-state={state}
      className="relative h-80 overflow-hidden bg-stone-100 lg:h-auto lg:min-h-[42rem]"
    >
      {(Object.entries(EMMA_STATE_IMAGES) as Array<[EmmaPresenceState, string]>).map(
        ([imageState, src]) => (
          <img
            key={imageState}
            src={src}
            alt=""
            aria-hidden="true"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-[center_18%] transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              imageState === state ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ),
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/65 via-stone-900/20 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-xl font-semibold tracking-wide">Emma</p>
        <p className="mt-1 text-sm text-white/90">AI 穿搭顧問</p>
      </div>
    </aside>
  );
}
