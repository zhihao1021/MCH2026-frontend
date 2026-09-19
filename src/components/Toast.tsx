import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastApi = (message: string, durationMs?: number) => void

const ToastCtx = createContext<ToastApi | null>(null)

/** 短暫訊息提示。功能機畫面小，避免用 alert() 打斷操作。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ToastApi>((text, durationMs = 2000) => {
    window.clearTimeout(timer.current)
    setMessage(text)
    timer.current = window.setTimeout(() => setMessage(null), durationMs)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const api = useMemo(() => show, [show])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {message !== null && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (ctx === null) throw new Error('useToast 必須在 <ToastProvider> 內使用')
  return ctx
}
