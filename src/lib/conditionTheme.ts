import { Condition } from '@/lib/conditions';

export interface ConditionTheme {
  isPersona: boolean;
  headerClass: string;
  headerBadgeClass: string;
  headerSubtitle: string;
  avatarClass: string;
  chatBotBubbleClass: string;
  chatBotNoteClass: string;
  chatUserBubbleClass: string;
  chatContainerClass: string;
  recommendationCardClass: string;
  recommendationAccent: string;
}

export function getConditionTheme(condition: Condition): ConditionTheme {
  const isPersona = condition.anthropomorphism === 'high';

  if (isPersona) {
    return {
      isPersona: true,
      headerClass: 'rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50',
      headerBadgeClass: 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700',
      headerSubtitle: '你的專屬穿搭顧問',
      avatarClass: 'shrink-0 rounded-full border-4 border-white shadow-md object-cover object-center',
      chatBotBubbleClass: 'rounded-2xl rounded-tl-md bg-rose-50 text-rose-950 border border-rose-100',
      chatBotNoteClass: 'rounded-xl bg-amber-50 text-amber-950 border border-amber-200',
      chatUserBubbleClass: 'rounded-2xl rounded-tr-md bg-rose-500 text-white',
      chatContainerClass: 'rounded-2xl border border-rose-100 bg-white shadow-lg',
      recommendationCardClass: 'rounded-2xl border-2 border-rose-100 bg-gradient-to-b from-white to-rose-50/40 shadow-lg',
      recommendationAccent: 'text-rose-700',
    };
  }

  return {
    isPersona: false,
    headerClass: 'rounded-lg border-2 border-slate-300 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200',
    headerBadgeClass: 'rounded-md bg-slate-700 px-3 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-slate-100',
    headerSubtitle: 'AI RECOMMENDATION SYSTEM v2.0',
    avatarClass: 'shrink-0 rounded-lg border-2 border-slate-400 bg-white object-cover object-center',
    chatBotBubbleClass: 'rounded-md bg-slate-100 text-slate-900 border border-slate-300 font-medium',
    chatBotNoteClass: 'rounded-md bg-slate-200 text-slate-900 border border-slate-400 font-mono text-sm',
    chatUserBubbleClass: 'rounded-md bg-slate-700 text-white',
    chatContainerClass: 'rounded-lg border-2 border-slate-300 bg-white shadow-md',
    recommendationCardClass: 'rounded-lg border-2 border-slate-300 bg-slate-50 shadow-md',
    recommendationAccent: 'text-slate-700',
  };
}

export function getConditionAvatarUrl(condition: Condition): string {
  if (condition.avatarUrl && !condition.avatarUrl.includes('placeholder')) {
    return condition.avatarUrl;
  }
  if (condition.avatarType === 'persona') {
    return '/images/avatars/emma.jpg';
  }
  return '/images/avatars/robot.svg';
}

export function getConditionAvatarFallbackUrl(condition: Condition): string {
  if (condition.avatarType === 'persona') {
    return '/images/avatars/emma.svg';
  }
  return '/images/avatars/robot.svg';
}

export function getConditionDisplayName(condition: Condition): string {
  return condition.anthropomorphism === 'high' ? '穿搭顧問 Emma' : 'AI 穿搭推薦系統';
}
