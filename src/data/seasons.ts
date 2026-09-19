export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'spring', label: '春季' },
  { id: 'summer', label: '夏季' },
  { id: 'autumn', label: '秋季' },
  { id: 'winter', label: '冬季' },
]

export function seasonLabel(season: Season): string {
  return SEASONS.find((s) => s.id === season)?.label ?? season
}

export function isSeason(value: string | null): value is Season {
  return value !== null && SEASONS.some((s) => s.id === value)
}
