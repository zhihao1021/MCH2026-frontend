import type { ReactNode } from 'react'
import { Page } from '../components/Page'
import { useT } from '../i18n'

/**
 * 把譯文裡的 {token} 換成 React 節點（連結）。
 * 翻譯字串不能塞 HTML，所以在這裡切開再拼回去，句子的語序就由譯者決定。
 */
function withNodes(template: string, nodes: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const token = /^\{(\w+)\}$/.exec(part)?.[1]
    return <span key={i}>{token !== undefined ? (nodes[token] ?? part) : part}</span>
  })
}

export function AboutPage() {
  const t = useT()

  const commons = (
    <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer">
      Wikimedia Commons
    </a>
  )
  const osm = (
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
      OpenStreetMap
    </a>
  )
  const osrm = (
    <a href="https://project-osrm.org" target="_blank" rel="noreferrer">
      OSRM
    </a>
  )

  return (
    <Page title={t('about.title')} softKeys={{ right: { label: t('common.back') } }}>
      <div className="prose">
        <h2>{t('about.heading')}</h2>
        <p>{t('about.intro')}</p>
        <p className="u-muted">{t('about.keys')}</p>
        <h3>{t('about.images.heading')}</h3>
        <p className="u-muted">{withNodes(t('about.images.body'), { link: commons })}</p>
        <h3>{t('about.map.heading')}</h3>
        <p className="u-muted">{withNodes(t('about.map.body'), { link: osm, routing: osrm })}</p>
      </div>
    </Page>
  )
}
