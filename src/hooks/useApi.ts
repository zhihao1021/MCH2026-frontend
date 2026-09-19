import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, AuthExpiredError } from '../api/client'
import { useI18n } from '../i18n'

type ApiState<T> = {
  data: T | null
  loading: boolean
  error: ApiError | null
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  // 登入逾期有自己的例外型別，轉成同一個錯誤碼，畫面才會顯示「請重新登入」而不是通用訊息
  if (err instanceof AuthExpiredError) return new ApiError(401, 'invalid_token', err.message)
  return new ApiError(0, 'unknown_error', err instanceof Error ? err.message : '發生未知錯誤')
}

/**
 * 各頁共用的資料載入 pattern：loading 顯示 <Spinner/>，
 * error 顯示 <ApiErrorNotice error onRetry={reload}/>。
 * deps 變動時重新抓取；用 cancelled flag 防止 unmount 後 setState。
 *
 * 語系也算依賴：品項名稱是後端依 Accept-Language 回的（API.md 2.3），
 * 換了語言不重抓的話，畫面會變成英文介面配中文作物名。
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): ApiState<T> & { reload: () => void } {
  const { locale } = useI18n()
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: toApiError(err) })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, locale])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { ...state, reload }
}

type ApiActionState = {
  pending: boolean
  error: ApiError | null
}

/** 需要使用者觸發（送出表單、新增報價…）而非掛載即抓的動作用這個。 */
export function useApiAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<T>,
): ApiActionState & { run: (...args: Args) => Promise<T | undefined> } {
  const [state, setState] = useState<ApiActionState>({ pending: false, error: null })
  const actionRef = useRef(action)
  useEffect(() => {
    actionRef.current = action
  })

  const run = useCallback(async (...args: Args) => {
    setState({ pending: true, error: null })
    try {
      const result = await actionRef.current(...args)
      setState({ pending: false, error: null })
      return result
    } catch (err) {
      setState({ pending: false, error: toApiError(err) })
      return undefined
    }
  }, [])

  return { ...state, run }
}
