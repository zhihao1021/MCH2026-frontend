import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

type ApiState<T> = {
  data: T | null
  loading: boolean
  error: ApiError | null
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  return new ApiError(0, 'unknown_error', err instanceof Error ? err.message : '發生未知錯誤')
}

/**
 * 各頁共用的資料載入 pattern：loading 顯示 <Spinner/>，
 * error 顯示 <ApiErrorNotice error onRetry={reload}/>。
 * deps 變動時重新抓取；用 cancelled flag 防止 unmount 後 setState。
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): ApiState<T> & { reload: () => void } {
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
  }, [...deps, tick])

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
