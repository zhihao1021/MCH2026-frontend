/**
 * 地區字串一律以後端 GET /v1/markets/regions 回傳的為準（縣市用「台」）。
 * 但使用者檔案／報價上的 region 可能寫「臺」（API.md 7.9 的提醒），
 * 比對時先正規化，不要因為一字之差就對不上。
 */
export function normalizeRegion(region: string): string {
  return region.replace(/臺/g, '台').trim()
}

export function sameRegion(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return normalizeRegion(a) === normalizeRegion(b)
}
