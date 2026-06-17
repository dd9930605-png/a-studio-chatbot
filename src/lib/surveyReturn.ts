const REFERRER_KEY = 'surveycake_referrer';
const RETURN_URL_KEY = 'surveycake_return_url';
const BACK_STEPS_KEY = 'surveycake_back_steps';

function isSurveyCakeUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('surveycake.com');
  } catch {
    return false;
  }
}

/** 進入 AI 網站時呼叫：記住從 SurveyCake 來的網址 */
export function captureSurveyEntry(returnUrlParam?: string | null): void {
  if (typeof window === 'undefined') return;

  if (returnUrlParam && isSurveyCakeUrl(returnUrlParam)) {
    sessionStorage.setItem(RETURN_URL_KEY, returnUrlParam);
    sessionStorage.removeItem(REFERRER_KEY);
    sessionStorage.setItem(BACK_STEPS_KEY, '1');
    return;
  }

  const existingSteps = sessionStorage.getItem(BACK_STEPS_KEY);
  if (existingSteps) {
    sessionStorage.setItem(BACK_STEPS_KEY, String(parseInt(existingSteps, 10) + 1));
    return;
  }

  const referrer = document.referrer;
  if (referrer && isSurveyCakeUrl(referrer)) {
    sessionStorage.setItem(REFERRER_KEY, referrer);
    sessionStorage.setItem(BACK_STEPS_KEY, '1');
  }
}

export function hasSurveyCakeReturn(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    sessionStorage.getItem(RETURN_URL_KEY) || sessionStorage.getItem(REFERRER_KEY),
  );
}

export interface SurveyReturnParams {
  participantId: string;
  conditionId: number;
  surpriseMode: string;
  expectedOutfit: string;
  finalRecommendedOutfit: string;
  expectationMismatch: number | null;
  selectedOutfitCategory: string;
}

function appendTrackingParams(baseUrl: string, params: SurveyReturnParams): string {
  const url = new URL(baseUrl);
  url.searchParams.set('pid', params.participantId);
  url.searchParams.set('condition', String(params.conditionId));
  url.searchParams.set('surprise', params.surpriseMode);
  url.searchParams.set('expected', params.expectedOutfit);
  url.searchParams.set('final', params.finalRecommendedOutfit);
  url.searchParams.set('mismatch', String(params.expectationMismatch ?? ''));
  url.searchParams.set('category', params.selectedOutfitCategory);
  return url.toString();
}

/**
 * 回到 SurveyCake。
 * 若受試者從 SurveyCake 同一分頁過來，優先用瀏覽器返回（可保留已填答案）。
 * 否則使用 continueUrl 或 fallbackUrl。
 */
export function returnToSurveyCake(
  fallbackUrl: string,
  params: SurveyReturnParams,
  continueUrl?: string,
): void {
  if (typeof window === 'undefined') return;

  const returnUrl = sessionStorage.getItem(RETURN_URL_KEY);
  const referrer = sessionStorage.getItem(REFERRER_KEY);
  const backSteps = parseInt(sessionStorage.getItem(BACK_STEPS_KEY) || '0', 10);

  if (!returnUrl && referrer && backSteps > 0 && window.history.length > backSteps) {
    window.history.go(-backSteps);
    return;
  }

  const target = continueUrl || returnUrl || fallbackUrl;
  window.location.assign(appendTrackingParams(target, params));
}
