/**
 * Web Mercator 圖磚座標（OpenStreetMap 標準 256px 圖磚）。
 *
 * 沒有用 Leaflet／MapLibre 這類地圖庫：它們都預設可拖曳、可縮放的觸控地圖，
 * 光是 JS 就比整個 app 還大，而這裡要的只是「兩個點加一條線」的靜態底圖。
 * 需要的數學就是下面這十幾行。
 */

import type { Coords } from './distance'

export const TILE_SIZE = 256
const MIN_ZOOM = 2
// OSM 提供到 19 層，但功能機畫面上再近也看不出差別，且對方座標可能本來就模糊化過
const MAX_ZOOM = 16
// 兩點之間至少要留這麼多比例的邊，標記才不會貼在畫面邊緣
const FIT_RATIO = 0.72

export type PixelPoint = { x: number; y: number }

export type Tile = {
  key: string
  /** 圖磚在世界格線上的 x（已繞過換日線），y 直接是列號。 */
  x: number
  y: number
  zoom: number
  /** 相對於視窗左上角的位置，單位 px。 */
  left: number
  top: number
}

/** 經緯度 → 該縮放層級的世界像素座標。 */
export function project(coords: Coords, zoom: number): PixelPoint {
  const scale = 2 ** zoom * TILE_SIZE
  const lat = Math.max(-85.05112878, Math.min(85.05112878, coords.latitude))
  const rad = (lat * Math.PI) / 180
  return {
    x: ((coords.longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale,
  }
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

function bounds(points: Coords[], zoom: number): Bounds {
  const xs = points.map((p) => project(p, zoom).x)
  const ys = points.map((p) => project(p, zoom).y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/**
 * 能容下所有點的最大縮放層級。
 * 傳進來的不只是起訖點，還有路線上的每一個轉折——路線繞路時（例如中間隔著山）
 * 只框住兩端會把路線畫到畫面外。
 */
export function chooseZoom(points: Coords[], width: number, height: number): number {
  for (let zoom = MAX_ZOOM; zoom > MIN_ZOOM; zoom -= 1) {
    const b = bounds(points, zoom)
    if (b.maxX - b.minX <= width * FIT_RATIO && b.maxY - b.minY <= height * FIT_RATIO) {
      return zoom
    }
  }
  return MIN_ZOOM
}

/** 視窗左上角的世界像素座標（以所有點的外接框中心為中心）。 */
export function viewportOrigin(
  points: Coords[],
  zoom: number,
  width: number,
  height: number,
): PixelPoint {
  const b = bounds(points, zoom)
  return {
    x: (b.minX + b.maxX) / 2 - width / 2,
    y: (b.minY + b.maxY) / 2 - height / 2,
  }
}

/** 蓋滿視窗所需的圖磚清單。超出南北極的列直接略過，東西向則繞回。 */
export function tileGrid(origin: PixelPoint, zoom: number, width: number, height: number): Tile[] {
  const count = 2 ** zoom
  const tiles: Tile[] = []
  const firstX = Math.floor(origin.x / TILE_SIZE)
  const lastX = Math.floor((origin.x + width) / TILE_SIZE)
  const firstY = Math.floor(origin.y / TILE_SIZE)
  const lastY = Math.floor((origin.y + height) / TILE_SIZE)

  for (let ty = firstY; ty <= lastY; ty += 1) {
    if (ty < 0 || ty >= count) continue
    for (let tx = firstX; tx <= lastX; tx += 1) {
      const wrappedX = ((tx % count) + count) % count
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        x: wrappedX,
        y: ty,
        zoom,
        left: tx * TILE_SIZE - origin.x,
        top: ty * TILE_SIZE - origin.y,
      })
    }
  }
  return tiles
}

/** 螢幕位置（相對視窗左上角）。 */
export function screenPoint(coords: Coords, zoom: number, origin: PixelPoint): PixelPoint {
  const p = project(coords, zoom)
  return { x: p.x - origin.x, y: p.y - origin.y }
}

export function tileUrl(tile: Tile): string {
  return `https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`
}
