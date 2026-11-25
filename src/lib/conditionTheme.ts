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

/** 低擬人化組的頭像：品牌標誌，不含人臉或機器人五官。 */
export const BRAND_LOGO_URL = '/images/avatars/astudio-logo.svg';

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
    headerClass: 'rounded-xl border border-neutral-200 bg-white',
    headerBadgeClass: 'rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs font-medium text-neutral-600',
    headerSubtitle: '面試穿搭推薦',
    avatarClass: 'shrink-0 rounded-lg border border-neutral-200 bg-neutral-900 object-cover object-center',
    chatBotBubbleClass: 'rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200',
    chatBotNoteClass: 'rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-300 text-sm',
    chatUserBubbleClass: 'rounded-xl bg-neutral-900 text-white',
    chatContainerClass: 'rounded-xl border border-neutral-200 bg-white shadow-sm',
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
  return BRAND_LOGO_URL;
}

export function getConditionAvatarFallbackUrl(condition: Condition): string {
  if (condition.avatarType === 'persona') {
    return '/images/avatars/emma.svg';
  }
  return BRAND_LOGO_URL;
}

export function getConditionDisplayName(condition: Condition): string {
  return condition.anthropomorphism === 'high' ? '穿搭顧問 Emma' : 'A.STUDIO AI';
}

/** 聊天泡泡上方的短稱呼。 */
export function getConditionShortName(condition: Condition): string {
  return condition.anthropomorphism === 'high' ? 'Emma' : 'A.STUDIO AI';
}
