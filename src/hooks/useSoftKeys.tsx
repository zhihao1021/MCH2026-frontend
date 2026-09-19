import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useBackKey, useKeypad } from './useKeypad'

export type SoftKeySlot = {
  label: string
  onPress?: () => void
}

export type SoftKeyConfig = {
  /** LSK（Escape），慣例放 Options / Menu。 */
  left?: SoftKeySlot
  /** 中鍵（Enter）。多半只是標示目前 Enter 的行為。 */
  center?: SoftKeySlot
  /** RSK，慣例放 Back / Exit。沒給 onPress 就走系統預設的返回。 */
  right?: SoftKeySlot
}

type Entry = { readonly config: SoftKeyConfig }

type SoftKeyApi = {
  push: (entry: Entry) => () => void
  sync: () => void
  peek: () => SoftKeyConfig
}

const EMPTY: SoftKeyConfig = {}

/**
 * 拆成兩個 context 是刻意的：
 * - Api 永遠不變，註冊者不會因為別頁改軟鍵而重繪。
 * - Value 會變，軟鍵列直接訂閱它。
 * 若只靠 provider 自身 re-render，children 是外層傳進來的同一份 element，
 * React 會跳過整個子樹，軟鍵列就永遠顯示不出來。
 */
const SoftKeyApiCtx = createContext<SoftKeyApi | null>(null)
const SoftKeyValueCtx = createContext<SoftKeyConfig>(EMPTY)

/**
 * 軟鍵狀態以堆疊管理：最上層（最晚掛載）的畫面決定軟鍵列內容，
 * 關閉彈窗後會自動還原下層頁面的軟鍵。
 */
export function SoftKeyProvider({ children }: { children: ReactNode }) {
  const stack = useRef<Entry[]>([])
  const [visible, setVisible] = useState<SoftKeyConfig>(EMPTY)

  const api = useMemo<SoftKeyApi>(() => {
    const top = () => stack.current.at(-1)?.config ?? EMPTY
    return {
      push(entry) {
        stack.current.push(entry)
        setVisible(top())
        return () => {
          stack.current = stack.current.filter((e) => e !== entry)
          setVisible(top())
        }
      },
      sync() {
        setVisible(top())
      },
      peek: top,
    }
  }, [])

  // 這個 handler 最早註冊 → 位於按鍵堆疊最底層，
  // 讓清單、彈窗等元件能先處理 Enter，沒人處理才落到軟鍵。
  useKeypad((key) => {
    const config = api.peek()
    if (key === 'SoftLeft' && config.left?.onPress) {
      config.left.onPress()
      return true
    }
    if (key === 'Enter' && config.center?.onPress) {
      config.center.onPress()
      return true
    }
  })

  return (
    <SoftKeyApiCtx.Provider value={api}>
      <SoftKeyValueCtx.Provider value={visible}>{children}</SoftKeyValueCtx.Provider>
    </SoftKeyApiCtx.Provider>
  )
}

function useSoftKeyApi(): SoftKeyApi {
  const ctx = useContext(SoftKeyApiCtx)
  if (ctx === null) throw new Error('useSoftKeys 必須在 <SoftKeyProvider> 內使用')
  return ctx
}

/**
 * 宣告目前畫面的軟鍵。config 不需要 memo，
 * 只有標籤文字變動時才會觸發軟鍵列重繪。
 */
export function useSoftKeys(config: SoftKeyConfig): void {
  const api = useSoftKeyApi()
  const configRef = useRef(config)

  useEffect(() => {
    configRef.current = config
  })

  // 堆疊裡放的是讀 ref 的 getter，換頁以外的重繪不會動到堆疊順序
  useEffect(
    () =>
      api.push({
        get config() {
          return configRef.current
        },
      }),
    [api],
  )

  // RSK 有自訂行為時攔截 back 事件，否則交給系統預設（回上一頁 / 關閉 widget）。
  useBackKey(() => {
    const onPress = configRef.current.right?.onPress
    if (onPress === undefined) return
    onPress()
    return true
  })

  // 標籤文字變動時才通知軟鍵列重繪
  const labels = `${config.left?.label ?? ''}|${config.center?.label ?? ''}|${config.right?.label ?? ''}`
  useEffect(() => {
    api.sync()
  }, [api, labels])
}

/** 給軟鍵列元件讀取目前該顯示的內容。 */
export function useCurrentSoftKeys(): SoftKeyConfig {
  return useContext(SoftKeyValueCtx)
}
