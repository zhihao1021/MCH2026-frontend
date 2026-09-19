import { useEffect, useState } from 'react'
import { useT, type Translate } from '../i18n'

function relativeTime(t: Translate, updatedAt: string): string {
  const diffMs = Date.now() - Date.parse(updatedAt)
  if (!Number.isFinite(diffMs) || diffMs < 0) return t('freshness.justNow')
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return t('freshness.justNow')
  if (minutes < 60) return t('freshness.minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('freshness.hours', { count: hours })
  const days = Math.floor(hours / 24)
  return t('freshness.days', { count: days })
}

/** 對應「每日官方數據同步」需求：資料來自 overview.updated_at 或 sources[].last_success_at。 */
export function FreshnessBadge({ updatedAt, label }: { updatedAt: string; label?: string }) {
  const t = useT()
  // 文字直接在 render 期間算，effect 只負責每分鐘觸發一次重繪，不存派生狀態
  const [, tick] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => tick((t) => t + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return <span className="badge badge--freshness">{label ?? relativeTime(t, updatedAt)}</span>
}
