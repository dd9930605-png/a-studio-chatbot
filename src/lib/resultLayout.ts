import { ResultLayoutVersion } from '@/lib/dataRecorder';

/** 正式收案固定 Card Version；不再對受試者開放切換。 */
export function isResultLayoutSwitchEnabled(): boolean {
  return false;
}

export function defaultResultLayout(): ResultLayoutVersion {
  return 'card';
}

/**
 * 正式入口一律回 card。
 * `?resultLayout=paragraph` 不再改變受試者畫面。
 */
export function resolveResultLayout(_searchValue?: string | null): ResultLayoutVersion {
  return 'card';
}
