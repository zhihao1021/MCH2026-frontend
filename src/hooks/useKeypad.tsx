import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { isTextEntryTarget, toCloudKey, type CloudKey } from '../lib/keys'

/** 回傳 true 表示已消化此按鍵，不再往下傳遞。 */
export type KeyHandler = (key: CloudKey, event: KeyboardEvent) => boolean | void
export type BackHandler = () => boolean | void

type Entry<T> = { fn: T }

type KeypadApi = {
  register: (entry: Entry<KeyHandler>) => () => void
  registerBack: (entry: Entry<BackHandler>) => () => void
}

const KeypadCtx = createContext<KeypadApi | null>(null)

/**
 * 全域按鍵派送。
 *
 * 採後進先出（LIFO）：越晚掛載的元件（例如彈出選單）越早拿到按鍵，
 * 回傳 true 即中斷傳遞。這樣 Modal / Menu 不需要互相知道對方存在。
 */
export function KeypadProvider({ children }: { children: ReactNode }) {
  const keyStack = useRef<Entry<KeyHandler>[]>([])
  const backStack = useRef<Entry<BackHandler>[]>([])

  const api = useMemo<KeypadApi>(
    () => ({
      register(entry) {
        keyStack.current.push(entry)
        return () => {
          keyStack.current = keyStack.current.filter((e) => e !== entry)
        }
      },
      registerBack(entry) {
        backStack.current.push(entry)
        return () => {
          backStack.current = backStack.current.filter((e) => e !== entry)
        }
      },
    }),
    [],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = toCloudKey(event)
      if (key === null) return
      // 全螢幕 IME 輸入中不攔截（桌機開發時才會遇到）
      if (isTextEntryTarget(event.target) && key !== 'SoftLeft') return

      for (let i = keyStack.current.length - 1; i >= 0; i -= 1) {
        if (keyStack.current[i].fn(key, event) === true) {
          event.preventDefault()
          return
        }
      }
    }

    /**
     * RSK 不會送鍵盤事件；Cloud Phone 以 window 的 `back` 事件通知，
     * preventDefault() 可攔下預設的 history.back() / window.close()。
     */
    const onBack = (event: Event) => {
      for (let i = backStack.current.length - 1; i >= 0; i -= 1) {
        if (backStack.current[i].fn() === true) {
          event.preventDefault()
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('back', onBack)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('back', onBack)
    }
  }, [])

  return <KeypadCtx.Provider value={api}>{children}</KeypadCtx.Provider>
}

function useKeypadApi(): KeypadApi {
  const ctx = useContext(KeypadCtx)
  if (ctx === null) throw new Error('useKeypad 必須在 <KeypadProvider> 內使用')
  return ctx
}

/**
 * 註冊按鍵處理器，元件卸載時自動移除。
 * handler 不需要 useCallback：實際函式放在 ref，堆疊上只掛一個穩定的轉接器，
 * 所以 handler 身分改變不會造成重新註冊、也不會影響堆疊順序。
 */
export function useKeypad(handler: KeyHandler, enabled = true): void {
  const api = useKeypadApi()
  const latest = useRef({ handler, enabled })

  useEffect(() => {
    latest.current = { handler, enabled }
  })

  useEffect(
    () =>
      api.register({
        fn: (key, event) =>
          latest.current.enabled ? latest.current.handler(key, event) : undefined,
      }),
    [api],
  )
}

/** 攔截 RSK（回上一頁）。回傳 true 代表自行處理，不執行預設的返回。 */
export function useBackKey(handler: BackHandler, enabled = true): void {
  const api = useKeypadApi()
  const latest = useRef({ handler, enabled })

  useEffect(() => {
    latest.current = { handler, enabled }
  })

  useEffect(
    () => api.registerBack({ fn: () => (latest.current.enabled ? latest.current.handler() : undefined) }),
    [api],
  )
}
