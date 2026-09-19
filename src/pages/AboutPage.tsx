import { Page } from '../components/Page'

export function AboutPage() {
  return (
    <Page title="關於" softKeys={{ right: { label: '返回' } }}>
      <div className="prose">
        <h2>MCH2026</h2>
        <p>Cloud Phone widget 介面骨架。</p>
        <p className="u-muted">
          方向鍵移動，Enter 選取，左軟鍵開選項，右軟鍵返回。
        </p>
      </div>
    </Page>
  )
}
