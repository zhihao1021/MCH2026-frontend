import type { Translate } from '../i18n'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export function seasonLabel(t: Translate, season: Season): string {
  return t(`seasons.${season}`)
}

export function isSeason(value: string | null): value is Season {
  return value !== null && (SEASONS as string[]).includes(value)
}
