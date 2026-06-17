const RETURN_URL_KEY = 'surveycake_return_url';

function isSurveyCakeUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('surveycake.com');
  } catch {
    return false;
  }
}

/** 進入 AI 網站時呼叫：記住 SurveyCake 返回網址 */
export function captureSurveyEntry(returnUrlParam?: string | null): void {
  if (typeof window === 'undefined') return;

  if (returnUrlParam && isSurveyCakeUrl(returnUrlParam)) {
    sessionStorage.setItem(RETURN_URL_KEY, returnUrlParam);
    return;
  }

  const referrer = document.referrer;
  if (referrer && isSurveyCakeUrl(referrer)) {
    sessionStorage.setItem(RETURN_URL_KEY, referrer);
  }
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

/** 直接跳轉回 SurveyCake（不使用瀏覽器返回，避免回到 AI 網站內頁） */
export function returnToSurveyCake(
  fallbackUrl: string,
  params: SurveyReturnParams,
  continueUrl?: string,
): void {
  if (typeof window === 'undefined') return;

  const returnUrl = sessionStorage.getItem(RETURN_URL_KEY);
  const target = continueUrl || returnUrl || fallbackUrl;
  window.location.assign(appendTrackingParams(target, params));
}
