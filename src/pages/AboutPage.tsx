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
        <h3>圖片來源</h3>
        <p className="u-muted">
          作物清單縮圖來自{' '}
          <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
            Wikimedia Commons
          </a>
          ，多數為 CC BY-SA／CC BY／GFDL 授權。個別完整出處、授權與作者標示請見各作物詳情頁。
        </p>
      </div>
    </Page>
  )
}
