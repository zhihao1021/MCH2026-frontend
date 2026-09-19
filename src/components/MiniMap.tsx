import { useState } from 'react'
import { useT } from '../i18n'
import {
  bearingDeg,
  compassLabel,
  distanceKm,
  formatDistance,
  type Coords,
} from '../lib/distance'
import {
  TILE_SIZE,
  chooseZoom,
  screenPoint,
  tileGrid,
  tileUrl,
  viewportOrigin,
} from '../lib/tiles'

type Props = {
  /** 我的座標，畫成圓點。 */
  from: Coords
  /** 對方座標，畫成標記。 */
  to: Coords
  width: number
  height: number
  /** 路線形狀。給了就畫實線路線，沒給（還在算／算不出來）就畫兩點之間的虛線。 */
  path?: Coords[]
  /** 直接畫示意圖，完全不抓圖磚（省流量模式）。 */
  schematic?: boolean
}

const MARGIN = 8

/**
 * 兩個座標的小地圖：OpenStreetMap 圖磚當底圖，上面疊自己畫的標記與連線。
 *
 * 圖磚只要有一張載入失敗（沒網路、被防火牆擋、圖磚服務掛掉）就整張退回示意圖，
 * 而不是留一塊空白——遠端渲染下使用者看不出「破圖」跟「還在載」的差別。
 * 示意圖不是地圖，所以會明講：只表達方位與距離，不表達地形。
 */
export function MiniMap({ from, to, width, height, path = [], schematic = false }: Props) {
  const t = useT()
  const [tilesFailed, setTilesFailed] = useState(false)

  const km = distanceKm(from, to)
  const bearing = bearingDeg(from, to)

  if (schematic || tilesFailed) {
    return <SchematicMap km={km} bearing={bearing} width={width} height={height} t={t} />
  }

  // 有路線就連路線上的轉折一起框進來，否則只框兩個端點
  const fitPoints = path.length > 0 ? [from, ...path, to] : [from, to]
  const zoom = chooseZoom(fitPoints, width, height)
  const origin = viewportOrigin(fitPoints, zoom, width, height)
  const tiles = tileGrid(origin, zoom, width, height)
  const me = clamp(screenPoint(from, zoom, origin), width, height)
  const them = clamp(screenPoint(to, zoom, origin), width, height)
  const routeLine =
    path.length > 1
      ? path.map((p) => screenPoint(p, zoom, origin)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      : null

  return (
    <div className="minimap" style={{ width, height }}>
      <div className="minimap__tiles">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className="minimap__tile"
            src={tileUrl(tile)}
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
            alt=""
            onError={() => setTilesFailed(true)}
          />
        ))}
      </div>
      <svg className="minimap__overlay" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('map.aria.map', { compass: compassLabel(t, bearing), distance: formatDistance(t, km) })}
      >
        {routeLine !== null ? (
          <>
            {/* 白色描邊墊在底下，路線壓過深色圖磚（樹林、水域）時才看得見 */}
            <polyline className="minimap__route-halo" points={routeLine} fill="none" />
            <polyline className="minimap__route" points={routeLine} fill="none" />
          </>
        ) : (
          <line className="minimap__link" x1={me.x} y1={me.y} x2={them.x} y2={them.y} />
        )}
        <Marker point={them} kind="them" />
        <Marker point={me} kind="me" />
      </svg>
      <span className="minimap__credit">© OpenStreetMap</span>
    </div>
  )
}

function Marker({ point, kind }: { point: { x: number; y: number }; kind: 'me' | 'them' }) {
  if (kind === 'me') {
    return (
      <>
        <circle className="minimap__halo" cx={point.x} cy={point.y} r={5} />
        <circle className="minimap__me" cx={point.x} cy={point.y} r={3} />
      </>
    )
  }
  // 對方用水滴狀標記，跟圓點一眼分得出來；尖端落在實際座標上
  const d = `M ${point.x} ${point.y} l -5 -8 a 5 5 0 1 1 10 0 z`
  return (
    <>
      <path className="minimap__halo-shape" d={d} />
      <path className="minimap__them" d={d} />
    </>
  )
}

function clamp(point: { x: number; y: number }, width: number, height: number) {
  return {
    x: Math.max(MARGIN, Math.min(width - MARGIN, point.x)),
    y: Math.max(MARGIN, Math.min(height - MARGIN, point.y)),
  }
}

/**
 * 沒有圖磚時的退路：以我為圓心的方位圖。
 * 外圈就是實際距離，所以圓上的刻度標的是距離本身，不是比例尺。
 */
function SchematicMap({
  km,
  bearing,
  width,
  height,
  t,
}: {
  km: number
  bearing: number
  width: number
  height: number
  t: ReturnType<typeof useT>
}) {
  const cx = width / 2
  const cy = height / 2
  // 小螢幕上外圈很快就縮到看不見，留一個下限
  const radius = Math.max(12, Math.min(width, height) / 2 - MARGIN * 1.5)
  const rad = ((bearing - 90) * Math.PI) / 180
  const them = { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }

  return (
    <div className="minimap minimap--schematic" style={{ width, height }}>
      <svg className="minimap__overlay" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('map.aria.schematic', {
          compass: compassLabel(t, bearing),
          distance: formatDistance(t, km),
        })}
      >
        <circle className="minimap__ring" cx={cx} cy={cy} r={radius} />
        <circle className="minimap__ring" cx={cx} cy={cy} r={radius / 2} />
        <line className="minimap__link" x1={cx} y1={cy} x2={them.x} y2={them.y} />
        <text className="minimap__north" x={cx} y={MARGIN + 2} textAnchor="middle">
          {t('map.north')}
        </text>
        <Marker point={them} kind="them" />
        <Marker point={{ x: cx, y: cy }} kind="me" />
      </svg>
      <span className="minimap__credit">{t('map.schematic')}</span>
    </div>
  )
}
