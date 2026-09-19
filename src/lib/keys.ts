/**
 * Cloud Phone 按鍵對應。
 *
 * 平台行為（見 https://www.cloudphone.tech/dev-guidelines）：
 * - 方向鍵、Enter、數字 0-9、* 、# 會以標準 KeyboardEvent 送到網頁。
 * - LSK（左軟鍵）對應 `Escape`。
 * - RSK（右軟鍵）不會送鍵盤事件，預設等同 history.back()，
 *   沒有歷史時等同 window.close()。要覆寫必須攔截 window 的 `back` 事件。
 */

export type CloudKey =
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'
  | 'Enter'
  | 'SoftLeft'
  | 'Digit0'
  | 'Digit1'
  | 'Digit2'
  | 'Digit3'
  | 'Digit4'
  | 'Digit5'
  | 'Digit6'
  | 'Digit7'
  | 'Digit8'
  | 'Digit9'
  | 'Star'
  | 'Pound'

const KEY_MAP: Record<string, CloudKey> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Enter: 'Enter',
  Escape: 'SoftLeft',
  // 部分模擬器 / 桌機瀏覽器會送 KaiOS 風格的鍵名
  SoftLeft: 'SoftLeft',
  '0': 'Digit0',
  '1': 'Digit1',
  '2': 'Digit2',
  '3': 'Digit3',
  '4': 'Digit4',
  '5': 'Digit5',
  '6': 'Digit6',
  '7': 'Digit7',
  '8': 'Digit8',
  '9': 'Digit9',
  '*': 'Star',
  '#': 'Pound',
}

/** 把原生 KeyboardEvent 轉成 CloudKey，不認得的鍵回傳 null。 */
export function toCloudKey(event: KeyboardEvent): CloudKey | null {
  return KEY_MAP[event.key] ?? null
}

/** 數字鍵 → 0-9，其它回傳 null（給快捷鍵選單用）。 */
export function digitOf(key: CloudKey): number | null {
  if (key.startsWith('Digit')) return Number(key.slice(5))
  return null
}

/**
 * 文字輸入中的元素不該被全域按鍵處理攔截。
 * Cloud Phone 的 <input> 會進入全螢幕 IME，期間不會送個別按鍵事件，
 * 但桌機開發時仍需要這個判斷。
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
