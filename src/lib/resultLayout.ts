import { ResultLayoutVersion } from '@/lib/dataRecorder';

/** 正式實驗預設卡片版。設為 0 後，網址參數不再切換版面。 */
export function isResultLayoutSwitchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_RESULT_LAYOUT_SWITCH !== '0';
}

export function defaultResultLayout(): ResultLayoutVersion {
  return process.env.NEXT_PUBLIC_RESULT_LAYOUT === 'paragraph' ? 'paragraph' : 'card';
}

/**
 * 測試用版面切換。正式受試者不應看到切換器；
 * 上線前將 NEXT_PUBLIC_RESULT_LAYOUT_SWITCH 設為 0。
 */
export function resolveResultLayout(searchValue: string | null | undefined): ResultLayoutVersion {
  if (
    isResultLayoutSwitchEnabled() &&
    (searchValue === 'card' || searchValue === 'paragraph')
  ) {
    return searchValue;
  }
  return defaultResultLayout();
}
