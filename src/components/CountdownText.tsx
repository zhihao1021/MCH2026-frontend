import { useEffect, useState } from 'react'

type Props = {
  seconds: number
  onComplete?: () => void
}

/**
 * 驅動 OTP 重寄冷卻倒數，秒數一律來自伺服器的 retry_after，不寫死 60 秒。
 * 呼叫端在 seconds 換新值時應該用 key={seconds} 讓這個元件重新掛載，
 * 而不是把 seconds 同步進 state（那樣需要多一個 effect 才能重置倒數）。
 */
export function CountdownText({ seconds, onComplete }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.()
      return
    }
    const timer = window.setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining, onComplete])

  if (remaining <= 0) return null

  return <span className="u-muted">{remaining} 秒後可重新索取</span>
}
