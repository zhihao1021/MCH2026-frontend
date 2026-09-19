import type { ReactNode } from 'react'
import { useSoftKeys, type SoftKeyConfig } from '../hooks/useSoftKeys'
import { SoftKeyBar } from './SoftKeyBar'

type Props = {
  title: string
  softKeys?: SoftKeyConfig
  /** 內容區不留邊界（整頁清單用）。 */
  flush?: boolean
  /** 標題列右側的狀態（例如 3/12）。 */
  headerAside?: ReactNode
  children: ReactNode
}

/**
 * 每一頁的外框：Header / 可捲動內容 / 軟鍵列。
 * 高度固定為 100%，只有中間區塊會捲動，避免 Header 被捲走。
 */
export function Page({ title, softKeys = {}, flush = false, headerAside, children }: Props) {
  useSoftKeys(softKeys)

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__header-title">{title}</span>
        {headerAside}
      </header>
      <main className={flush ? 'app__content app__content--flush' : 'app__content'}>
        {children}
      </main>
      <SoftKeyBar />
    </div>
  )
}
